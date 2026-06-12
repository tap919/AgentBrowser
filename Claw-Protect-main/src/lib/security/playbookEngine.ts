/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Security Playbook / SOAR Engine — Inspired by Tracecat
 *
 * Provides automated incident response workflows (playbooks) that
 * execute predefined remediation steps when security events occur.
 *
 * Key concepts from Tracecat:
 *   • Low-code playbook builder with triggers and actions
 *   • Case management for incident tracking
 *   • Human-in-the-loop approval gates
 *   • Pre-built playbook templates
 *   • Durable execution (actions retry on failure)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlaybookStatus = 'draft' | 'active' | 'paused' | 'archived';

export type TriggerType =
  | 'prompt_injection'
  | 'behavioral_drift'
  | 'data_exfiltration'
  | 'shadow_agent'
  | 'supply_chain_vuln'
  | 'compliance_violation'
  | 'manual';

export type ActionType =
  | 'quarantine_agent'
  | 'revoke_credentials'
  | 'block_domain'
  | 'notify_team'
  | 'create_case'
  | 'escalate'
  | 'run_scan'
  | 'snapshot_state'
  | 'require_approval'
  | 'custom';

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'awaiting_approval';

export type CasePriority = 'low' | 'medium' | 'high' | 'critical';
export type CaseStatus = 'open' | 'investigating' | 'remediated' | 'closed';

export interface PlaybookStep {
  id: string;
  order: number;
  name: string;
  actionType: ActionType;
  config: Record<string, unknown>;
  requiresApproval: boolean;
  timeoutSeconds: number;
  retryCount: number;
}

export interface Playbook {
  id: string;
  name: string;
  description: string;
  status: PlaybookStatus;
  trigger: TriggerType;
  steps: PlaybookStep[];
  createdAt: Date;
  lastExecuted?: Date;
  executionCount: number;
}

export interface PlaybookExecution {
  id: string;
  playbookId: string;
  playbookName: string;
  triggeredBy: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed' | 'awaiting_approval';
  stepResults: StepResult[];
  caseId?: string;
}

export interface StepResult {
  stepId: string;
  stepName: string;
  actionType: ActionType;
  status: StepStatus;
  startedAt: Date;
  completedAt?: Date;
  output?: string;
  error?: string;
}

export interface SecurityCase {
  id: string;
  title: string;
  description: string;
  priority: CasePriority;
  status: CaseStatus;
  assignee?: string;
  playbookExecutionId?: string;
  createdAt: Date;
  updatedAt: Date;
  events: CaseEvent[];
}

export interface CaseEvent {
  timestamp: Date;
  message: string;
  actor: string; // "system" | user / agent ID
}

// ─── Pre-built Playbook Templates ─────────────────────────────────────────────

function makeStep(
  order: number,
  name: string,
  actionType: ActionType,
  config: Record<string, unknown> = {},
  requiresApproval = false,
): PlaybookStep {
  return {
    id: `step_${Math.random().toString(36).substring(2, 9)}`,
    order,
    name,
    actionType,
    config,
    requiresApproval,
    timeoutSeconds: 300,
    retryCount: 1,
  };
}

const PLAYBOOK_TEMPLATES: Omit<Playbook, 'id' | 'createdAt' | 'executionCount'>[] = [
  {
    name: 'Prompt Injection Response',
    description: 'Automatically respond when a prompt injection attack is detected',
    status: 'active',
    trigger: 'prompt_injection',
    steps: [
      makeStep(1, 'Snapshot Agent State', 'snapshot_state'),
      makeStep(2, 'Quarantine Agent', 'quarantine_agent', { mode: 'read-only' }),
      makeStep(3, 'Notify Security Team', 'notify_team', { channel: '#security-alerts' }),
      makeStep(4, 'Create Investigation Case', 'create_case', { priority: 'high' }),
      makeStep(5, 'Run Deep Scan', 'run_scan', { type: 'full' }),
      makeStep(6, 'Approve Agent Restoration', 'require_approval', { approvers: ['security-lead'] }, true),
    ],
  },
  {
    name: 'Data Exfiltration Containment',
    description: 'Contain and investigate suspected data exfiltration',
    status: 'active',
    trigger: 'data_exfiltration',
    steps: [
      makeStep(1, 'Block Suspicious Domains', 'block_domain'),
      makeStep(2, 'Quarantine Agent', 'quarantine_agent', { mode: 'offline' }),
      makeStep(3, 'Revoke Agent Credentials', 'revoke_credentials'),
      makeStep(4, 'Snapshot Evidence', 'snapshot_state'),
      makeStep(5, 'Escalate to Incident Response', 'escalate', { team: 'ir-team' }),
      makeStep(6, 'Create Case', 'create_case', { priority: 'critical' }),
    ],
  },
  {
    name: 'Shadow Agent Discovery Response',
    description: 'Investigate and contain unregistered shadow agents',
    status: 'active',
    trigger: 'shadow_agent',
    steps: [
      makeStep(1, 'Snapshot Agent Activity', 'snapshot_state'),
      makeStep(2, 'Notify Security Team', 'notify_team', { channel: '#shadow-agents' }),
      makeStep(3, 'Create Investigation Case', 'create_case', { priority: 'high' }),
      makeStep(4, 'Quarantine Pending Review', 'quarantine_agent', { mode: 'read-only' }),
      makeStep(5, 'Approval to Terminate', 'require_approval', { approvers: ['admin'] }, true),
    ],
  },
  {
    name: 'Supply Chain Vulnerability Fix',
    description: 'Respond to detected supply chain vulnerabilities in agent tools',
    status: 'active',
    trigger: 'supply_chain_vuln',
    steps: [
      makeStep(1, 'Run Vulnerability Scan', 'run_scan', { type: 'supply-chain' }),
      makeStep(2, 'Notify DevSecOps', 'notify_team', { channel: '#devsecops' }),
      makeStep(3, 'Create Remediation Case', 'create_case', { priority: 'medium' }),
      makeStep(4, 'Approval to Apply Fix', 'require_approval', { approvers: ['devsecops-lead'] }, true),
    ],
  },
  {
    name: 'Behavioral Drift Investigation',
    description: 'Investigate agents showing behavioral drift from established baselines',
    status: 'active',
    trigger: 'behavioral_drift',
    steps: [
      makeStep(1, 'Snapshot Behavioral Data', 'snapshot_state'),
      makeStep(2, 'Run Anomaly Analysis', 'run_scan', { type: 'behavioral' }),
      makeStep(3, 'Notify Agent Owner', 'notify_team'),
      makeStep(4, 'Create Investigation Case', 'create_case', { priority: 'medium' }),
    ],
  },
  {
    name: 'Compliance Violation Response',
    description: 'Handle policy violations and compliance control failures',
    status: 'active',
    trigger: 'compliance_violation',
    steps: [
      makeStep(1, 'Log Violation Details', 'snapshot_state'),
      makeStep(2, 'Notify Compliance Team', 'notify_team', { channel: '#compliance' }),
      makeStep(3, 'Quarantine if Critical', 'quarantine_agent', { mode: 'read-only' }),
      makeStep(4, 'Create Compliance Case', 'create_case', { priority: 'high' }),
      makeStep(5, 'Escalate to Legal', 'escalate', { team: 'legal' }),
    ],
  },
];

// ─── Engine ───────────────────────────────────────────────────────────────────

class PlaybookEngine {
  private playbooks: Map<string, Playbook> = new Map();
  private executions: PlaybookExecution[] = [];
  private cases: Map<string, SecurityCase> = new Map();

  constructor() {
    // Seed templates
    for (const tpl of PLAYBOOK_TEMPLATES) {
      const id = `pb_${Math.random().toString(36).substring(2, 9)}`;
      this.playbooks.set(id, { ...tpl, id, createdAt: new Date(), executionCount: 0 });
    }
  }

  // ── Playbooks ─────────────────────────────────────────────────────────────

  getPlaybooks(status?: PlaybookStatus): Playbook[] {
    const all = Array.from(this.playbooks.values());
    return status ? all.filter((p) => p.status === status) : all;
  }

  getPlaybook(id: string): Playbook | undefined {
    return this.playbooks.get(id);
  }

  createPlaybook(playbook: Omit<Playbook, 'id' | 'createdAt' | 'executionCount'>): Playbook {
    const id = `pb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const full: Playbook = { ...playbook, id, createdAt: new Date(), executionCount: 0 };
    this.playbooks.set(id, full);
    return full;
  }

  togglePlaybook(id: string): Playbook | undefined {
    const pb = this.playbooks.get(id);
    if (!pb) return undefined;
    pb.status = pb.status === 'active' ? 'paused' : 'active';
    return pb;
  }

  // ── Execution ─────────────────────────────────────────────────────────────

  /** Execute a playbook (synchronous simulation). */
  executePlaybook(playbookId: string, triggeredBy: string): PlaybookExecution | undefined {
    const pb = this.playbooks.get(playbookId);
    if (!pb || pb.status !== 'active') return undefined;

    const exec: PlaybookExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      playbookId,
      playbookName: pb.name,
      triggeredBy,
      startedAt: new Date(),
      status: 'running',
      stepResults: [],
    };

    // Simulate running each step
    for (const step of [...pb.steps].sort((a, b) => a.order - b.order)) {
      const result: StepResult = {
        stepId: step.id,
        stepName: step.name,
        actionType: step.actionType,
        status: 'running',
        startedAt: new Date(),
      };

      if (step.requiresApproval) {
        result.status = 'awaiting_approval';
        result.output = 'Waiting for human approval';
        exec.status = 'awaiting_approval';
        exec.stepResults.push(result);
        break; // Pause execution at approval gate
      }

      // Simulate completion (90% success rate)
      const succeeded = Math.random() > 0.1;
      result.status = succeeded ? 'completed' : 'failed';
      result.completedAt = new Date();
      result.output = succeeded
        ? `${step.name} completed successfully`
        : `${step.name} failed — will retry`;

      if (!succeeded) {
        result.error = `Simulated failure in ${step.actionType}`;
      }

      exec.stepResults.push(result);

      // Create case if this step creates one
      if (step.actionType === 'create_case' && succeeded) {
        const newCase = this.createCase({
          title: `[Auto] ${pb.name} — triggered by ${triggeredBy}`,
          description: `Automated case created by playbook "${pb.name}"`,
          priority: (step.config.priority as CasePriority) ?? 'medium',
          playbookExecutionId: exec.id,
        });
        exec.caseId = newCase.id;
      }
    }

    if (exec.status === 'running') {
      exec.status = exec.stepResults.some((r) => r.status === 'failed') ? 'failed' : 'completed';
      exec.completedAt = new Date();
    }

    pb.executionCount++;
    pb.lastExecuted = new Date();
    this.executions.push(exec);

    return exec;
  }

  /** Find playbooks that match a trigger type and execute them. */
  handleTrigger(trigger: TriggerType, triggeredBy: string): PlaybookExecution[] {
    const matching = Array.from(this.playbooks.values())
      .filter((pb) => pb.trigger === trigger && pb.status === 'active');

    return matching
      .map((pb) => this.executePlaybook(pb.id, triggeredBy))
      .filter(Boolean) as PlaybookExecution[];
  }

  getExecutions(playbookId?: string, limit: number = 50): PlaybookExecution[] {
    let filtered = this.executions;
    if (playbookId) filtered = filtered.filter((e) => e.playbookId === playbookId);
    return filtered.slice(-limit).reverse();
  }

  // ── Cases ─────────────────────────────────────────────────────────────────

  createCase(params: {
    title: string;
    description: string;
    priority: CasePriority;
    playbookExecutionId?: string;
    assignee?: string;
  }): SecurityCase {
    const now = new Date();
    const secCase: SecurityCase = {
      id: `case_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title: params.title,
      description: params.description,
      priority: params.priority,
      status: 'open',
      assignee: params.assignee,
      playbookExecutionId: params.playbookExecutionId,
      createdAt: now,
      updatedAt: now,
      events: [
        { timestamp: now, message: 'Case created', actor: 'system' },
      ],
    };
    this.cases.set(secCase.id, secCase);
    return secCase;
  }

  updateCaseStatus(caseId: string, status: CaseStatus, actor: string): SecurityCase | undefined {
    const c = this.cases.get(caseId);
    if (!c) return undefined;
    c.status = status;
    c.updatedAt = new Date();
    c.events.push({ timestamp: new Date(), message: `Status changed to ${status}`, actor });
    return c;
  }

  addCaseEvent(caseId: string, message: string, actor: string): SecurityCase | undefined {
    const c = this.cases.get(caseId);
    if (!c) return undefined;
    c.events.push({ timestamp: new Date(), message, actor });
    c.updatedAt = new Date();
    return c;
  }

  getCases(status?: CaseStatus, limit: number = 50): SecurityCase[] {
    const all = Array.from(this.cases.values());
    const filtered = status ? all.filter((c) => c.status === status) : all;
    return filtered
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit);
  }

  getCase(id: string): SecurityCase | undefined {
    return this.cases.get(id);
  }

  // ── Statistics ─────────────────────────────────────────────────────────────

  getStatistics(): {
    totalPlaybooks: number;
    activePlaybooks: number;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    openCases: number;
    criticalCases: number;
  } {
    const pbs = Array.from(this.playbooks.values());
    const cases = Array.from(this.cases.values());

    return {
      totalPlaybooks: pbs.length,
      activePlaybooks: pbs.filter((p) => p.status === 'active').length,
      totalExecutions: this.executions.length,
      successfulExecutions: this.executions.filter((e) => e.status === 'completed').length,
      failedExecutions: this.executions.filter((e) => e.status === 'failed').length,
      openCases: cases.filter((c) => c.status === 'open' || c.status === 'investigating').length,
      criticalCases: cases.filter((c) => c.priority === 'critical').length,
    };
  }
}

// Singleton
export const playbookEngine = new PlaybookEngine();
