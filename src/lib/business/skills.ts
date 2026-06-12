export type BusinessSkillId =
  | 'content-creation' | 'seo-analysis' | 'social-posting'
  | 'market-research' | 'competitor-analysis' | 'email-marketing'
  | 'ad-optimization' | 'revenue-analysis' | 'budget-tracking'
  | 'music-promotion' | 'analytics-reporting';

export interface BusinessSkill {
  id: BusinessSkillId;
  name: string;
  description: string;
  category: 'marketing' | 'finance' | 'operations' | 'growth';
  schedule: 'daily' | 'weekly' | 'monthly' | 'manual';
  estimatedDuration: number;
  config: Record<string, unknown>;
}

export const BUSINESS_SKILLS: BusinessSkill[] = [
  {
    id: 'content-creation', name: 'Content Creation',
    description: 'Generate blog posts, social media content, and marketing copy using AI. Posts across platforms.',
    category: 'marketing', schedule: 'daily', estimatedDuration: 30,
    config: { platforms: ['blog', 'twitter', 'linkedin'], tone: 'professional', maxPosts: 3 },
  },
  {
    id: 'seo-analysis', name: 'SEO Analysis',
    description: 'Analyze website and content for SEO optimization opportunities. Check rankings, keywords, backlinks.',
    category: 'marketing', schedule: 'weekly', estimatedDuration: 15,
    config: { depth: 'comprehensive', competitors: true },
  },
  {
    id: 'social-posting', name: 'Social Media Posting',
    description: 'Schedule and publish content across social media platforms. Auto-generate post variations.',
    category: 'marketing', schedule: 'daily', estimatedDuration: 20,
    config: { platforms: ['twitter', 'linkedin', 'instagram'], autoGenerate: true },
  },
  {
    id: 'market-research', name: 'Market Research',
    description: 'Research market trends, identify new opportunities, and track industry developments.',
    category: 'growth', schedule: 'weekly', estimatedDuration: 45,
    config: { sources: ['news', 'trending', 'competitor'], depth: 'comprehensive' },
  },
  {
    id: 'competitor-analysis', name: 'Competitor Analysis',
    description: 'Monitor competitor activities, pricing changes, and new feature releases.',
    category: 'growth', schedule: 'weekly', estimatedDuration: 30,
    config: { trackPricing: true, trackFeatures: true, trackMarketing: true },
  },
  {
    id: 'email-marketing', name: 'Email Marketing',
    description: 'Create and schedule email campaigns. Segment audiences and track engagement metrics.',
    category: 'marketing', schedule: 'weekly', estimatedDuration: 25,
    config: { segments: ['customers', 'leads', 'partners'], template: 'newsletter' },
  },
  {
    id: 'ad-optimization', name: 'Ad Optimization',
    description: 'Analyze ad performance across platforms. Optimize spend, targeting, and creative.',
    category: 'marketing', schedule: 'weekly', estimatedDuration: 30,
    config: { platforms: ['google', 'meta', 'twitter'], budgetOptimization: true },
  },
  {
    id: 'revenue-analysis', name: 'Revenue Analysis',
    description: 'Track revenue streams, identify growth opportunities, and forecast future revenue.',
    category: 'finance', schedule: 'daily', estimatedDuration: 10,
    config: { streams: ['music', 'software', 'services'], forecasting: true },
  },
  {
    id: 'budget-tracking', name: 'Budget Tracking',
    description: 'Monitor spending across categories. Alert on overruns and optimize resource allocation.',
    category: 'finance', schedule: 'daily', estimatedDuration: 5,
    config: { categories: ['tools', 'marketing', 'infrastructure'], alertThreshold: 0.8 },
  },
  {
    id: 'music-promotion', name: 'Music Promotion',
    description: 'Promote music catalog across streaming platforms. Track plays, revenue, and engagement.',
    category: 'growth', schedule: 'daily', estimatedDuration: 20,
    config: { artists: ['Tap919', 'Niro'], platforms: ['spotify', 'apple', 'youtube'], autoPromote: true },
  },
  {
    id: 'analytics-reporting', name: 'Analytics Reporting',
    description: 'Generate comprehensive business analytics reports. Track KPIs, trends, and actionable insights.',
    category: 'operations', schedule: 'weekly', estimatedDuration: 15,
    config: { format: 'dashboard', includeCharts: true, metrics: ['revenue', 'costs', 'growth'] },
  },
];

export function getSkill(id: BusinessSkillId): BusinessSkill | undefined {
  return BUSINESS_SKILLS.find(s => s.id === id);
}

export function getSkillsByCategory(category: BusinessSkill['category']): BusinessSkill[] {
  return BUSINESS_SKILLS.filter(s => s.category === category);
}

export function getScheduledSkills(): BusinessSkill[] {
  return BUSINESS_SKILLS.filter(s => s.schedule !== 'manual');
}
