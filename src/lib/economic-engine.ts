import { writeMemory } from '@/lib/agent-memory';
import { agentEventBus } from '@/lib/agent-event-bus';

// Track PRO revenue from music rights operations
export interface ProRevenueEntry {
  date: string;
  pro: 'ASCAP' | 'MLC' | 'HFA';
  workTitle: string;
  amount: number;
  type: 'mechanical' | 'performance' | 'sync';
  period: string;
}

const proRevenueStore: ProRevenueEntry[] = [];

export function recordProRevenue(entry: ProRevenueEntry): void {
  proRevenueStore.push(entry);

  // Persist to shared memory for finance tracking
  writeMemory({
    namespace: 'pro-revenue',
    key: `${entry.pro}:${entry.date}:${entry.workTitle.replace(/\s+/g, '-')}`,
    value: entry,
    agentId: 'economic-engine',
    ttl: 7776000,
  }).catch((err) => console.error('[economic-engine] writeMemory failed', err));

  agentEventBus.emit('discovery', 'economic-engine', {
    type: 'pro-revenue-recorded',
    pro: entry.pro,
    amount: entry.amount,
    workTitle: entry.workTitle,
  }, true);
}

export function getProRevenueSummary(): { total: number; byPro: Record<string, number>; byType: Record<string, number> } {
  const byPro: Record<string, number> = {};
  const byType: Record<string, number> = {};
  let total = 0;

  for (const entry of proRevenueStore) {
    total += entry.amount;
    byPro[entry.pro] = (byPro[entry.pro] || 0) + entry.amount;
    byType[entry.type] = (byType[entry.type] || 0) + entry.amount;
  }

  return { total, byPro, byType };
}

// Content → Deploy workflow
export interface ContentDeployWorkflow {
  topic: string;
  siteName: string;
  description: string;
  deployedUrl?: string;
  status: 'planned' | 'generated' | 'deployed';
}

export async function triggerContentDeploy(workflow: ContentDeployWorkflow): Promise<void> {
  await writeMemory({
    namespace: 'content-deploy',
    key: `workflow:${workflow.topic.replace(/\s+/g, '-')}:${Date.now()}`,
    value: workflow,
    agentId: 'economic-engine',
    ttl: 2592000,
  }).catch((err) => console.error('[economic-engine] writeMemory failed', err));

  agentEventBus.emit('decision', 'economic-engine', {
    type: 'content-deploy-triggered',
    topic: workflow.topic,
    siteName: workflow.siteName,
    status: workflow.status,
  }, true);
}

// Competitive monitoring
export interface CompetitiveSignal {
  competitor: string;
  signal: string;
  severity: 'info' | 'warning' | 'critical';
  source: string;
  detectedAt: string;
}

export function recordCompetitiveSignal(signal: CompetitiveSignal): void {
  writeMemory({
    namespace: 'competitive-intel',
    key: `${signal.competitor}:${signal.detectedAt}`,
    value: signal,
    agentId: 'economic-engine',
    ttl: 604800,
  }).catch((err) => console.error('[economic-engine] writeMemory failed', err));

  agentEventBus.emit('alert', 'economic-engine', {
    type: 'competitive-signal',
    competitor: signal.competitor,
    signal: signal.signal,
    severity: signal.severity,
  }, signal.severity === 'critical');
}
