import cron from 'node-cron';
import { EventEmitter } from 'events';
import {
  estimateNextRun,
  runPresetAgent,
  runPresetAgentAsync,
  type ExecutionLog,
  type ScheduledAgent,
  type SchedulerStats,
} from '@/lib/autonomous-agents';
import {
  ensureAutonomousSeedData,
  listAutonomousAgents,
  listAutonomousRuns,
  recordAutonomousRun,
  updateAutonomousAgent,
  getAutonomousSettings,
} from '@/lib/autonomous-store';
import { schedulePipelines } from '@/lib/agent-orchestrator';
import { securityMiddleware } from '@/lib/security-middleware';
import { createUpgradeJob } from '@/lib/autonomous-store';
import { writeMemory, searchMemory } from '@/lib/agent-memory';
import { agentEventBus } from '@/lib/agent-event-bus';
import { registerBuiltInWorkflows, listWorkflows, runWorkflow } from '@/lib/workflow-engine';
import { bigHomie } from '@/lib/big-homie-client';

interface CronJob {
  stop: () => void;
  start: () => void;
}

class AgentScheduler extends EventEmitter {
  private agents: Map<string, ScheduledAgent> = new Map();
  private cronJobs: Map<string, CronJob> = new Map();
  private executionLogs: ExecutionLog[] = [];
  private readonly MAX_LOGS = 100;
  private initialized = false;
  private initializing: Promise<void> | null = null;

  private inFlightRuns: Map<string, Promise<ExecutionLog>> = new Map();
  private refreshLock = false;
  private refreshQueue: Array<{ resolve: () => void; reject: (err: Error) => void }> = [];

  constructor() {
    super();
  }

  private async acquireRefreshLock(): Promise<void> {
    if (!this.refreshLock) {
      this.refreshLock = true;
      return;
    }
    return new Promise<void>((resolve, reject) => {
      this.refreshQueue.push({ resolve, reject });
    });
  }

  private releaseRefreshLock(): void {
    const next = this.refreshQueue.shift();
    if (next) {
      next.resolve();
    } else {
      this.refreshLock = false;
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    if (this.initializing) {
      return this.initializing;
    }

    this.initializing = (async () => {
      try {
        // Register built-in workflows so the scheduler and API both see them
        registerBuiltInWorkflows();

        await ensureAutonomousSeedData();
        const agents = await listAutonomousAgents();
        const logs = await listAutonomousRuns(undefined, this.MAX_LOGS);
        const settings = await getAutonomousSettings();
        await schedulePipelines();

        this.executionLogs = logs;
        this.agents.clear();
        this.cronJobs.forEach(job => job.stop());
        this.cronJobs.clear();

        for (const agent of agents) {
          this.registerAgent(agent);
        }

        if (!settings.enabled) {
          this.cronJobs.forEach(job => job.stop());
        }

        // Recover missed runs: catch up agents that should have run while down
        await this.recoverMissedRuns();

        // Start periodic health check cron
        await this.startHealthCheckCron();
        // Start periodic memory cleanup cron
        await this.startMemoryCleanupCron();

        this.initialized = true;
      } catch (error) {
        this.initializing = null;
        this.initialized = false;
        throw error;
      }
    })();

    return this.initializing;
  }

  registerAgent(agent: ScheduledAgent): void {
    this.agents.set(agent.id, agent);

    if (agent.enabled) {
      this.scheduleAgent(agent);
    }
  }

  private scheduleAgent(agent: ScheduledAgent): void {
    const existingJob = this.cronJobs.get(agent.id);
    if (existingJob) {
      existingJob.stop();
      this.cronJobs.delete(agent.id);
    }

    const job = cron.schedule(agent.cronExpression, async () => {
      await this.executeAgent(agent.id);
    });

    this.cronJobs.set(agent.id, job as unknown as CronJob);
    agent.nextRun = estimateNextRun(agent.cronExpression) ?? undefined;
  }

  async executeAgent(agentId: string): Promise<ExecutionLog> {
    const inFlight = this.inFlightRuns.get(agentId);
    if (inFlight) {
      return inFlight;
    }

    // Wait for initialization if in progress, skip if already done
    if (!this.initialized) {
      await this.initialize();
    }
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Security gate: validate agent execution through Claw Protect
    const secResult = await securityMiddleware.validateAction(
      `agent:execute:${agent.id}`,
      { agentId: agent.id, agentName: agent.name, skills: agent.skills } as Record<string, unknown>,
    );
    if (!secResult.approved) {
      throw new Error(`Agent execution blocked by security: ${secResult.blockedReasons.join(', ')}`);
    }

    const runPromise = this.doExecuteAgent(agent);
    this.inFlightRuns.set(agentId, runPromise);

    try {
      return await runPromise;
    } finally {
      this.inFlightRuns.delete(agentId);
    }
  }

  private async doExecuteAgent(agent: ScheduledAgent): Promise<ExecutionLog> {
    const startTime = Date.now();
    agent.status = 'running';
    agent.lastRun = new Date().toISOString();
    agent.nextRun = undefined;
    await updateAutonomousAgent(agent.id, {
      status: agent.status,
      lastRun: agent.lastRun,
      nextRun: undefined,
    });
    this.emit('agent:started', { agentId: agent.id, timestamp: agent.lastRun });

    try {
      const output = await this.runAgentSkills(agent);
      const duration = Date.now() - startTime;

      agent.status = 'completed';
      agent.executionCount++;
      agent.successCount++;
      agent.nextRun = agent.enabled ? estimateNextRun(agent.cronExpression) ?? undefined : undefined;

      const log: ExecutionLog = {
        agentId: agent.id,
        timestamp: new Date().toISOString(),
        status: 'success',
        duration,
        output,
      };

      this.addLog(log);
      await recordAutonomousRun(log);
      await updateAutonomousAgent(agent.id, {
        status: agent.status,
        executionCount: agent.executionCount,
        successCount: agent.successCount,
        nextRun: agent.nextRun,
      });

      // Store agent output in shared memory (non-critical, after DB write)
      try {
        await writeMemory({
          namespace: 'agent-outputs',
          key: `last-run:${agent.id}`,
          value: { agentId: agent.id, status: 'success', output, duration, timestamp: new Date().toISOString() },
          agentId: agent.id,
          ttl: 86400,
        });
      } catch (memErr) {
        console.warn('[AgentScheduler] Memory write failed:', memErr);
      }

      // Emit to internal EventEmitter (consumed by this class's listeners)
      this.emit('agent:completed', log);

      // Emit on shared event bus (for cross-agent triggers and durable history)
      agentEventBus.emit('agent:completed', `scheduler:${agent.id}`, {
        agentId: agent.id, agentName: agent.name, output, duration,
      }, true);

      // Cross-agent trigger: check if other agents should react to this completion
      await this.fireCrossAgentTriggers(agent, output).catch(err => {
        console.error('[AgentScheduler] Cross-agent trigger failed:', err);
      });

      // Auto-trigger: if this is the self-upgrade-scanner agent, create upgrade jobs for auto-approve targets
      if (agent.id === 'self-upgrade-scanner' && agent.config.autoCreateJobs) {
        this.triggerUpgradeJobs(agent).catch(err => {
          console.error('[AgentScheduler] Failed to auto-create upgrade jobs:', err);
        });
      }

      return log;
    } catch (error) {
      const duration = Date.now() - startTime;
      agent.status = 'failed';
      agent.executionCount++;
      agent.failureCount++;
      agent.nextRun = agent.enabled ? estimateNextRun(agent.cronExpression) ?? undefined : undefined;

      const log: ExecutionLog = {
        agentId: agent.id,
        timestamp: new Date().toISOString(),
        status: 'failed',
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      this.addLog(log);
      await recordAutonomousRun(log);
      await updateAutonomousAgent(agent.id, {
        status: agent.status,
        executionCount: agent.executionCount,
        failureCount: agent.failureCount,
        nextRun: agent.nextRun,
      });
      this.emit('agent:failed', log);
      throw error;
    }
  }

  private async runAgentSkills(agent: ScheduledAgent): Promise<unknown> {
    // Try async preset first (handles dynamic book search)
    const asyncOutput = await runPresetAgentAsync(agent);
    if (asyncOutput) {
      return {
        preset: true,
        ...asyncOutput,
        executedSkills: agent.skills,
      };
    }

    // Fall back to sync preset (handles static agents like content-machine, etc.)
    const presetOutput = runPresetAgent(agent);
    if (presetOutput) {
      return {
        preset: true,
        ...presetOutput,
        executedSkills: agent.skills,
      };
    }

    const results: Record<string, unknown> = {};

    for (const skill of agent.skills) {
      try {
        results[skill] = await this.executeSkill(skill, agent.config);
      } catch (error) {
        results[skill] = { error: error instanceof Error ? error.message : 'Failed' };
      }
    }

    return results;
  }

  private async fireCrossAgentTriggers(completed: ScheduledAgent, output: unknown): Promise<void> {
    // Market Intelligence → Content Machine: when market-intel finds something, trigger content-machine
    if (completed.id === 'market-intelligence' && output) {
      const contentAgent = this.agents.get('content-machine');
      if (contentAgent?.enabled) {
        agentEventBus.emit('trigger:content-from-intel', `scheduler:${completed.id}`, {
          sourceAgent: completed.id,
          intelligence: output,
          suggestedAction: 'generate-content',
        }, true);
      }
    }

    // Content Machine → Business Daily: when content is generated, check budgets
    if (completed.id === 'content-machine' && output) {
      const bizAgent = this.agents.get('business-daily');
      if (bizAgent?.enabled) {
        agentEventBus.emit('trigger:business-from-content', `scheduler:${completed.id}`, {
          sourceAgent: completed.id,
          content: output,
          suggestedAction: 'check-budgets',
        }, true);
      }
    }

    // Self-Upgrade Scanner → any: store findings in memory for other agents to consume
    if (completed.id === 'self-upgrade-scanner') {
      try {
        await writeMemory({
          namespace: 'upgrades',
          key: `latest-scan:${Date.now()}`,
          value: { timestamp: new Date().toISOString(), output },
          agentId: 'self-upgrade-scanner',
          ttl: 604800,
        });
      } catch (err) { console.error('[scheduler] writeMemory upgrade-scanner', err); }
    }

    // Learning Digest → any: store book search results for other agents to consume
    if (completed.id === 'learning-digest' && output) {
      try {
        await writeMemory({
          namespace: 'book-knowledge',
          key: `learning-digest:${Date.now()}`,
          value: { timestamp: new Date().toISOString(), output },
          agentId: 'learning-digest',
          ttl: 86400,
        });
      } catch (err) { console.error('[scheduler] writeMemory learning-digest', err); }
    }

    // Business Book Insights → Business Daily: when insights are generated, trigger daily routine
    if (completed.id === 'business-book-insights' && output) {
      const bizAgent = this.agents.get('business-daily');
      if (bizAgent?.enabled) {
        agentEventBus.emit('trigger:business-from-insights', `scheduler:${completed.id}`, {
          sourceAgent: completed.id,
          insights: output,
          suggestedAction: 'check-budgets',
        }, true);
      }
    }

    // Finance Book Analysis → Memory: store analysis for market-intelligence agent
    if (completed.id === 'finance-book-analysis' && output) {
      try {
        await writeMemory({
          namespace: 'financial-insights',
          key: `finance-analysis:${Date.now()}`,
          value: { timestamp: new Date().toISOString(), output },
          agentId: 'finance-book-analysis',
          ttl: 43200,
        });
      } catch (err) { console.error('[scheduler] writeMemory finance-analysis', err); }
    }
  }

  private async triggerUpgradeJobs(agent: ScheduledAgent): Promise<void> {
    const { MASSIVE_UPGRADE_SWEEP, determineApprovalPlan } = await import('@/lib/upgrade-sweep');
    for (const target of MASSIVE_UPGRADE_SWEEP) {
      const plan = determineApprovalPlan(target);
      if (plan.autoExecute) {
        try {
          await createUpgradeJob(target.targetId, { autoCreated: true });
          // Auto-created upgrade job for ${target.targetName}
        } catch (err) {
          console.error(`[AgentScheduler] Failed to create upgrade job for ${target.targetName}:`, err);
        }
      }
    }
  }

  private async executeSkill(skill: string, config: Record<string, unknown>): Promise<unknown> {
    const isHealthy = await bigHomie.checkHealth();
    if (!isHealthy) {
      console.warn(`[AgentScheduler] Big Homie unreachable — trying local fallback for skill ${skill}`);
      const fallback = await runPresetAgentAsync({ id: 'fallback', skills: [skill], config, name: 'fallback', description: '', cronExpression: '', status: 'idle', executionCount: 0, successCount: 0, failureCount: 0, enabled: false });
      if (fallback) return fallback;
      return { status: 'error', skill, note: 'Big Homie down and no local fallback available' };
    }
    return bigHomie.executeSkill(skill, config);
  }

  private addLog(log: ExecutionLog): void {
    this.executionLogs.unshift(log);
    if (this.executionLogs.length > this.MAX_LOGS) {
      this.executionLogs = this.executionLogs.slice(0, this.MAX_LOGS);
    }
  }

  getAgents(): ScheduledAgent[] {
    return Array.from(this.agents.values());
  }

  getAgent(agentId: string): ScheduledAgent | undefined {
    return this.agents.get(agentId);
  }

  async refreshAgents(): Promise<void> {
    await this.acquireRefreshLock();
    try {
      const agents = await listAutonomousAgents();
      const settings = await getAutonomousSettings();

      for (const agent of agents) {
        const existing = this.agents.get(agent.id);
        if (existing) {
          Object.assign(existing, agent);
          if (existing.enabled && !this.cronJobs.has(existing.id)) {
            this.scheduleAgent(existing);
          } else if (!existing.enabled && this.cronJobs.has(existing.id)) {
            const job = this.cronJobs.get(existing.id);
            if (job) {
              job.stop();
              this.cronJobs.delete(existing.id);
            }
          }
        } else {
          this.registerAgent(agent);
        }
      }

      if (!settings.enabled) {
        this.cronJobs.forEach(job => job.stop());
      } else {
        this.cronJobs.forEach((job, id) => {
          const agent = this.agents.get(id);
          if (agent?.enabled) {
            job.start();
          }
        });
      }
    } finally {
      this.releaseRefreshLock();
    }
  }

  async updateAgent(agentId: string, updates: Partial<ScheduledAgent>): Promise<void> {
    await this.initialize();
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    Object.assign(agent, updates);

    if (updates.cronExpression || updates.enabled !== undefined) {
      if (agent.enabled) {
        this.scheduleAgent(agent);
      } else {
        const job = this.cronJobs.get(agentId);
        if (job) {
          job.stop();
          this.cronJobs.delete(agentId);
        }
      }
    }

    this.agents.set(agentId, agent);
    agent.nextRun = agent.enabled ? estimateNextRun(agent.cronExpression) ?? undefined : undefined;
    await updateAutonomousAgent(agentId, {
      enabled: agent.enabled,
      cronExpression: agent.cronExpression,
      status: agent.status,
      nextRun: agent.nextRun,
    });
    this.emit('agent:updated', agent);
  }

  deleteAgent(agentId: string): void {
    const job = this.cronJobs.get(agentId);
    if (job) {
      job.stop();
      this.cronJobs.delete(agentId);
    }
    this.agents.delete(agentId);
    this.emit('agent:deleted', agentId);
  }

  getExecutionLogs(agentId?: string): ExecutionLog[] {
    if (agentId) {
      return this.executionLogs.filter(log => log.agentId === agentId);
    }
    return this.executionLogs;
  }

  async triggerNow(agentId: string): Promise<ExecutionLog> {
    return this.executeAgent(agentId);
  }

  getStats(): SchedulerStats {
    const agents = this.getAgents();
    return {
      totalAgents: agents.length,
      enabledAgents: agents.filter(a => a.enabled).length,
      totalExecutions: agents.reduce((sum, a) => sum + a.executionCount, 0),
      totalSuccesses: agents.reduce((sum, a) => sum + a.successCount, 0),
      totalFailures: agents.reduce((sum, a) => sum + a.failureCount, 0),
    };
  }

  private async recoverMissedRuns(): Promise<void> {
    const now = new Date();
    const missed: string[] = [];
    for (const [id, agent] of this.agents) {
      if (agent.enabled && agent.nextRun && new Date(agent.nextRun) < now) {
        missed.push(id);
      }
    }
    if (missed.length > 0) {
      // Recovering missed agent runs: ${missed.join(', ')}
      await Promise.allSettled(missed.map(id => this.executeAgent(id)));
    }
  }

  private healthCheckCron: CronJob | null = null;
  private memoryCleanupCron: CronJob | null = null;

  async startHealthCheckCron(): Promise<void> {
    if (process.env.DISABLE_HEALTH_CHECK_CRON === 'true') return;
    const { default: cron } = await import('node-cron');
    this.healthCheckCron = cron.schedule('*/5 * * * *', () => {
      this.runHealthCheck().catch(err => console.error('[AgentScheduler] Health check error:', err));
    }) as unknown as CronJob;
  }

  async startMemoryCleanupCron(): Promise<void> {
    const { default: cron } = await import('node-cron');
    this.memoryCleanupCron = cron.schedule('0 3 * * *', async () => {
      const { cleanExpiredMemory } = await import('@/lib/agent-memory');
      const removed = await cleanExpiredMemory();
      if (removed > 0) {
        process.stdout.write(`[AgentScheduler] Cleaned ${removed} expired memory entries\n`);
      }
    }) as unknown as CronJob;
  }

  private async runHealthCheck(): Promise<void> {
    const { checkClawProtectHealth } = await import('@/lib/claw-protect-client');
    const { checkMutlyHealth } = await import('@/lib/mutly-client');
    const { checkVibeServeHealth } = await import('@/lib/vibeserve-client');
    const { checkReporankHealth } = await import('@/lib/reporank-client');

    const bh = await fetch(`${process.env.NEXT_PUBLIC_BIG_HOMIE_URL || 'http://localhost:8888'}/tools/status`, { signal: AbortSignal.timeout(3000) }).then(r => r.ok).catch(() => false);
    const claw = await checkClawProtectHealth();
    const mutly = await checkMutlyHealth();
    const vibeserve = await checkVibeServeHealth();
    const reporank = await checkReporankHealth();

    const down: string[] = [];
    if (!bh) down.push('big-homie');
    if (!claw) down.push('claw-protect');
    if (!mutly) down.push('mutly');
    if (!vibeserve) down.push('vibeserve');
    if (!reporank) down.push('reporank');

    if (down.length > 0) {
      console.warn(`[AgentScheduler] Subsystems down: ${down.join(', ')}`);
      agentEventBus.emit('error', 'health-check', { down, timestamp: new Date().toISOString() }, true);
    }
  }

  shutdown(): void {
    this.cronJobs.forEach(job => job.stop());
    this.cronJobs.clear();
    if (this.healthCheckCron) {
      this.healthCheckCron.stop();
      this.healthCheckCron = null;
    }
    if (this.memoryCleanupCron) {
      this.memoryCleanupCron.stop();
      this.memoryCleanupCron = null;
    }
  }
}

export const agentScheduler = new AgentScheduler();

// Register cleanup on process exit - avoids lingering cron jobs and connections
function cleanupScheduler(): void {
  agentScheduler.shutdown();
}

if (typeof process !== 'undefined') {
  process.on('SIGINT', cleanupScheduler);
  process.on('SIGTERM', cleanupScheduler);
  process.on('exit', cleanupScheduler);
}
