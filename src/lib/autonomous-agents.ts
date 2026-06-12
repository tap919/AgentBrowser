export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed' | 'paused';
export type AutonomyPolicy = 'conservative' | 'balanced' | 'aggressive';

export interface AutonomousModeSettings {
  enabled: boolean;
  policyLevel: AutonomyPolicy;
  autoConfigure: boolean;
  autoUpgradeSafe: boolean;
  resumeOnRestart: boolean;
  lastConfiguredAt?: string;
}

export interface ScheduledAgent {
  id: string;
  name: string;
  description: string;
  cronExpression: string;
  skills: string[];
  status: AgentStatus;
  lastRun?: string;
  nextRun?: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface ExecutionLog {
  agentId: string;
  timestamp: string;
  status: 'success' | 'failed';
  duration: number;
  output?: unknown;
  error?: string;
}

export interface SchedulerStats {
  totalAgents: number;
  enabledAgents: number;
  totalExecutions: number;
  totalSuccesses: number;
  totalFailures: number;
}

export const DEFAULT_AUTONOMOUS_SETTINGS: AutonomousModeSettings = {
  enabled: false,
  policyLevel: 'conservative',
  autoConfigure: true,
  autoUpgradeSafe: true,
  resumeOnRestart: true,
};

function createAgent(partial: Pick<ScheduledAgent, 'id' | 'name' | 'description' | 'cronExpression' | 'skills' | 'config'> & Partial<Pick<ScheduledAgent, 'enabled'>>): ScheduledAgent {
  return {
    ...partial,
    status: 'idle',
    executionCount: 0,
    successCount: 0,
    failureCount: 0,
    enabled: partial.enabled ?? true,
  };
}

export const AUTONOMOUS_AGENT_PRESETS: ScheduledAgent[] = [
  createAgent({
    id: 'auto-target-tracker',
    name: 'Auto Target Tracker',
    description: 'Tracks screenshot-based goal progress using image understanding prompts and scheduled check-in windows.',
    cronExpression: '0 8,12,20 * * *',
    skills: ['auto-target-tracker', 'VLM', 'image-understand'],
    config: {
      goalTypes: ['learning', 'fitness', 'work', 'habits'],
      reminderWindows: ['08:00', '12:00', '20:00'],
      captureKeywords: ['progress', 'goal', 'task', 'workout', 'note'],
    },
  }),
  createAgent({
    id: 'content-machine',
    name: 'Content Machine',
    description: 'Builds a daily content package with topic angle, SEO brief, draft structure, and hero image prompt.',
    cronExpression: '0 9 * * *',
    skills: ['content-strategy', 'seo-content-writer', 'image-generation'],
    config: {
      contentPillars: ['ai browser workflows', 'automation ops', 'agent strategy'],
      outputTypes: ['seo-brief', 'article-outline', 'hero-image-prompt'],
      targetWordCount: 1800,
    },
  }),
  createAgent({
    id: 'market-intelligence',
    name: 'Market Intelligence',
    description: 'Runs recurring search and reading workflows to surface market shifts, headlines, and competitor signals.',
    cronExpression: '0 * * * *',
    skills: ['multi-search-engine', 'web-reader', 'finance'],
    config: {
      watchlist: ['browser automation', 'agent browser', 'ai tooling'],
      sources: ['Bing INT', 'Toutiao', 'Jisilu'],
      alertThreshold: 'medium',
    },
  }),
  createAgent({
    id: 'business-daily',
    name: 'Business Daily',
    description: 'Executes the daily business routine — budget tracking, revenue analysis, content creation, music promotion checks.',
    cronExpression: '0 7 * * 1-5',
    skills: ['business-routine', 'finance', 'reporting'],
    config: {
      routines: ['check-budgets', 'track-revenue', 'generate-content', 'check-analytics'],
      autoAlert: true,
    },
  }),
  createAgent({
    id: 'business-weekly',
    name: 'Business Weekly',
    description: 'Runs weekly strategic business skills — market research, competitor analysis, SEO audit, analytics reporting, email campaign prep.',
    cronExpression: '0 9 * * 1',
    skills: ['business-routine', 'strategy', 'reporting'],
    config: {
      routines: ['scan-trends', 'check-competitors', 'audit-seo', 'generate-report', 'prepare-campaign'],
      industry: 'music-tech',
    },
  }),
  createAgent({
    id: 'self-upgrade-scanner',
    name: 'Self-Upgrade Scanner',
    description: 'Scans trending repos, evaluates fit against system components, and creates upgrade requests for auto-approved targets.',
    cronExpression: '0 6 * * 0',
    skills: ['upgrade-scan', 'trending-analysis'],
    config: {
      maxRecommendations: 3,
      autoCreateJobs: true,
    },
  }),
];

export function describeCron(cronExpression: string): string {
  switch (cronExpression) {
    case '0 8,12,20 * * *':
      return 'Daily at 08:00, 12:00, and 20:00';
    case '0 9 * * *':
      return 'Daily at 09:00';
    case '0 * * * *':
      return 'Every hour';
    case '0 7 * * 1-5':
      return 'Weekdays at 07:00';
    case '0 9 * * 1':
      return 'Weekly Monday at 09:00';
    case '0 6 * * 0':
      return 'Weekly Sunday at 06:00';
    default:
      return cronExpression;
  }
}

function parseNumberList(field: string, min: number, max: number): number[] | null {
  if (field === '*') {
    return Array.from({ length: max - min + 1 }, (_, index) => min + index);
  }

  const values = field.split(',').map(value => Number.parseInt(value.trim(), 10));
  if (values.some(value => Number.isNaN(value) || value < min || value > max)) {
    return null;
  }

  return [...new Set(values)].sort((a, b) => a - b);
}

export function estimateNextRun(cronExpression: string, from = new Date()): string | undefined {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return undefined;
  }

  const [minuteField, hourField, dayOfMonth, month, dayOfWeek] = parts;
  if (dayOfMonth !== '*' || month !== '*' || dayOfWeek !== '*') {
    return undefined;
  }

  const minutes = parseNumberList(minuteField, 0, 59);
  const hours = parseNumberList(hourField, 0, 23);
  if (!minutes || !hours) {
    return undefined;
  }

  const next = new Date(from);
  next.setSeconds(0, 0);

  for (let dayOffset = 0; dayOffset < 8; dayOffset++) {
    const base = new Date(next);
    base.setDate(base.getDate() + dayOffset);

    for (const hour of hours) {
      for (const minute of minutes) {
        const candidate = new Date(base);
        candidate.setHours(hour, minute, 0, 0);
        if (candidate.getTime() > from.getTime()) {
          return candidate.toISOString();
        }
      }
    }
  }

  return undefined;
}

function buildTargetTrackerOutput(agent: ScheduledAgent) {
  const reminderWindows = Array.isArray(agent.config.reminderWindows) ? agent.config.reminderWindows : [];
  const captureKeywords = Array.isArray(agent.config.captureKeywords) ? agent.config.captureKeywords : [];
  return {
    summary: 'Prepared screenshot ingestion prompts for the next goal check-in window.',
    reminderWindows,
    captureKeywords,
    nextAction: 'Inspect uploaded screenshots, extract progress metrics, and append a daily check-in summary.',
  };
}

function buildContentMachineOutput(agent: ScheduledAgent) {
  const pillars = Array.isArray(agent.config.contentPillars) ? agent.config.contentPillars : [];
  const selectedPillar = pillars[0] ?? 'ai browser workflows';
  return {
    summary: 'Prepared a new content package for the next publishing cycle.',
    pillar: selectedPillar,
    topic: `How ${selectedPillar} turns browsing into a repeatable autonomous workflow`,
    seoBrief: {
      primaryKeyword: 'agent browser workflow',
      secondaryKeywords: ['autonomous browsing', 'ai browser automation', 'agent ops'],
      targetWordCount: agent.config.targetWordCount ?? 1800,
    },
    imagePrompt: 'Futuristic browser cockpit dashboard with AI agents coordinating tasks, cinematic lighting, editorial illustration',
  };
}

function buildMarketIntelligenceOutput(agent: ScheduledAgent) {
  const watchlist = Array.isArray(agent.config.watchlist) ? agent.config.watchlist : [];
  const sources = Array.isArray(agent.config.sources) ? agent.config.sources : [];
  return {
    summary: 'Prepared a fresh market scan across configured search and reading sources.',
    watchlist,
    sources,
    alerts: [
      'Monitor browser automation competitors for new feature drops.',
      'Track agent-browser infrastructure mentions for distribution opportunities.',
      'Review finance-linked market headlines for AI tooling spending shifts.',
    ],
  };
}

export function runPresetAgent(agent: ScheduledAgent): Record<string, unknown> | null {
  switch (agent.id) {
    case 'auto-target-tracker':
      return buildTargetTrackerOutput(agent);
    case 'content-machine':
      return buildContentMachineOutput(agent);
    case 'market-intelligence':
      return buildMarketIntelligenceOutput(agent);
    case 'business-daily':
      return {
        summary: 'Daily business routine queued',
        routines: agent.config.routines,
        autoAlert: agent.config.autoAlert,
      };
    case 'business-weekly':
      return {
        summary: 'Weekly strategic routine queued',
        routines: agent.config.routines,
        industry: agent.config.industry,
      };
    case 'self-upgrade-scanner':
      return {
        summary: 'Trending repo scan triggered',
        maxRecommendations: agent.config.maxRecommendations,
        autoCreate: agent.config.autoCreateJobs,
      };
    default:
      return null;
  }
}
