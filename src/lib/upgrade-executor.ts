import { db } from '@/lib/db';
import { agentEventBus } from '@/lib/agent-event-bus';
import { writeMemory } from '@/lib/agent-memory';
import { MASSIVE_UPGRADE_SWEEP } from '@/lib/upgrade-sweep';
import type { UpgradeSweepRecommendation, UpgradeImplementationReport } from '@/lib/upgrade-sweep';

export async function executeUpgrade(target: UpgradeSweepRecommendation): Promise<UpgradeImplementationReport> {
  const start = Date.now();
  const report: UpgradeImplementationReport = {
    finishedAt: '',
    durationSeconds: 0,
    outcome: 'success',
    touchedSystems: [],
    summary: '',
    followUp: [],
  };

  try {
    // 1. Research: fetch repo details and read key files
    const researchResults: string[] = [];
    for (const repo of target.recommendedRepos) {
      try {
        const res = await fetch(`https://api.github.com/repos/${repo.repo}/readme`, {
          headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'AgentBrowser/1.0' },
        });
        if (res.ok) {
          const data = await res.json() as { content?: string };
          if (data.content) {
            const decoded = Buffer.from(data.content, 'base64').toString('utf-8');
            researchResults.push(`# ${repo.name}\n${decoded.slice(0, 2000)}`);
          }
        }
      } catch { /* continue despite individual failures */ }
    }

    // 2. Store research in memory for the build pipeline to consume
    await writeMemory({
      namespace: 'upgrade-research',
      key: `research:${target.targetId}:${Date.now()}`,
      value: { target: target.targetId, research: researchResults, repos: target.recommendedRepos },
      agentId: 'upgrade-executor',
      ttl: 86400,
    });

    report.touchedSystems = [target.targetId, ...target.recommendedRepos.map(r => r.name)];
    report.summary = `Upgrade research completed for ${target.targetName}. ${researchResults.length} repos analyzed. Ready for pipeline integration.`;
    report.followUp = [
      `Review research for ${target.targetName}`,
      'Run build pipeline with upgrade context to generate integration code',
      'Test and validate before production deploy',
    ];

    agentEventBus.emit('artifact', `upgrade-executor:${target.targetId}`, {
      type: 'upgrade-research',
      target: target.targetId,
      reposAnalyzed: researchResults.length,
    }, true);
  } catch (err: unknown) {
    report.outcome = 'failure';
    report.summary = `Upgrade execution failed: ${err instanceof Error ? err.message : 'Unknown'}`;
    report.followUp = ['Review error logs and retry'];
  }

  report.finishedAt = new Date().toISOString();
  report.durationSeconds = Math.round((Date.now() - start) / 1000);
  return report;
}

export async function processUpgradeQueue(): Promise<void> {
  const pendingJobs = await db.autonomousUpgradeJob.findMany({
    where: {
      status: { in: ['queued', 'awaiting_approval'] },
      autoExecute: true,
    },
    orderBy: { createdAt: 'asc' },
    take: 5,
  });

  for (const job of pendingJobs) {
    try {
      const target = MASSIVE_UPGRADE_SWEEP.find(t => t.targetId === job.targetId);
      if (!target) continue;

      await db.autonomousUpgradeJob.update({
        where: { id: job.id },
        data: { status: 'running' },
      });

      const report = await executeUpgrade(target);

      await db.autonomousUpgradeJob.update({
        where: { id: job.id },
        data: { status: report.outcome === 'success' ? 'completed' : 'failed', report: JSON.parse(JSON.stringify(report)) },
      });
    } catch (err) {
      console.error(`[UpgradeExecutor] Failed to process job ${job.id}:`, err);
      await db.autonomousUpgradeJob.update({
        where: { id: job.id },
        data: { status: 'failed' },
      });
    }
  }
}
