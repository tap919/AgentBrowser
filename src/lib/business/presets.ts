import type { ScheduledAgent } from '@/lib/autonomous-agents';

export const BUSINESS_AGENT_PRESETS: ScheduledAgent[] = [
  {
    id: 'biz-daily-routine',
    name: 'Daily Business Routine',
    description: 'Runs daily business operations: budget checks, revenue tracking, content creation, music promotion',
    cronExpression: '0 8 * * 1-5', // Weekdays at 8 AM
    skills: ['budget-tracking', 'revenue-analysis', 'content-creation', 'music-promotion'],
    status: 'idle',
    executionCount: 0,
    successCount: 0,
    failureCount: 0,
    enabled: false,
    config: {
      endpoint: '/api/business',
      action: 'run-daily',
      securityLevel: 'active',
    },
  },
  {
    id: 'biz-weekly-review',
    name: 'Weekly Business Review',
    description: 'Weekly market research, competitor analysis, SEO audit, and analytics reporting',
    cronExpression: '0 9 * * 1', // Mondays at 9 AM
    skills: ['market-research', 'competitor-analysis', 'seo-analysis', 'analytics-reporting', 'email-marketing'],
    status: 'idle',
    executionCount: 0,
    successCount: 0,
    failureCount: 0,
    enabled: false,
    config: {
      endpoint: '/api/business',
      action: 'run-weekly',
      securityLevel: 'active',
    },
  },
  {
    id: 'biz-budget-monitor',
    name: 'Budget Monitor',
    description: 'Monitors budgets daily and alerts on overruns. Tracks all transactions and account balances.',
    cronExpression: '0 18 * * *', // Daily at 6 PM
    skills: ['budget-tracking', 'revenue-analysis'],
    status: 'idle',
    executionCount: 0,
    successCount: 0,
    failureCount: 0,
    enabled: false,
    config: {
      endpoint: '/api/business',
      action: 'execute-skill',
      skill: 'budget-tracking',
      alertThreshold: 0.8,
      securityLevel: 'passive',
    },
  },
  {
    id: 'biz-content-publisher',
    name: 'Content Publisher',
    description: 'Generates and publishes content across blog and social media. Auto-creates post variations.',
    cronExpression: '0 10 * * 1,3,5', // Mon, Wed, Fri at 10 AM
    skills: ['content-creation', 'social-posting'],
    status: 'idle',
    executionCount: 0,
    successCount: 0,
    failureCount: 0,
    enabled: false,
    config: {
      endpoint: '/api/business',
      action: 'execute-skill',
      skill: 'content-creation',
      platforms: ['blog', 'twitter', 'linkedin'],
      maxPosts: 3,
      securityLevel: 'active',
    },
  },
  {
    id: 'biz-music-promoter',
    name: 'Music Promoter',
    description: 'Promotes Tap919 and Niro catalogs. Checks streaming analytics, suggests promotion opportunities.',
    cronExpression: '0 12 * * *', // Daily at noon
    skills: ['music-promotion', 'analytics-reporting'],
    status: 'idle',
    executionCount: 0,
    successCount: 0,
    failureCount: 0,
    enabled: false,
    config: {
      endpoint: '/api/business',
      action: 'execute-skill',
      skill: 'music-promotion',
      artists: ['Tap919', 'Niro'],
      platforms: ['spotify', 'apple', 'youtube'],
      securityLevel: 'active',
    },
  },
  {
    id: 'biz-market-intel',
    name: 'Market Intelligence',
    description: 'Weekly market research and competitor tracking. Identifies trends and opportunities.',
    cronExpression: '0 7 * * 1', // Mondays at 7 AM
    skills: ['market-research', 'competitor-analysis'],
    status: 'idle',
    executionCount: 0,
    successCount: 0,
    failureCount: 0,
    enabled: false,
    config: {
      endpoint: '/api/business',
      action: 'execute-skill',
      skill: 'market-research',
      industry: 'music-tech',
      securityLevel: 'active',
    },
  },
];

export function getBusinessPresetAgents(): ScheduledAgent[] {
  return BUSINESS_AGENT_PRESETS;
}
