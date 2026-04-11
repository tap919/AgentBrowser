'use client';

import { useState } from 'react';
import { AppIcon } from '@/lib/icons';
import { Star, TrendingUp, ExternalLink, GitFork, ArrowUpRight } from 'lucide-react';

interface TrendingRepo {
  name: string;
  repo: string;
  stars: string;
  description: string;
  category: 'browser' | 'agent' | 'orchestration';
  icon: string;
  color: string;
  highlights: string[];
}

const TRENDING_REPOS: TrendingRepo[] = [
  // Browser Automation
  {
    name: 'browser-use',
    repo: 'browser-use/browser-use',
    stars: '86k',
    description: 'The #1 AI browser automation — natural language control with LLM-driven browsing',
    category: 'browser',
    icon: 'brain',
    color: 'text-pink-500',
    highlights: ['Model-agnostic', 'Stealth mode', 'Multi-step tasks'],
  },
  {
    name: 'Lightpanda',
    repo: 'lightpanda-io/browser',
    stars: '28k',
    description: 'Blazing-fast headless browser built in Zig for AI-first automation',
    category: 'browser',
    icon: 'zap',
    color: 'text-amber-400',
    highlights: ['Ultra-fast', 'AI-optimized', 'Low-level APIs'],
  },
  {
    name: 'Skyvern',
    repo: 'Skyvern-AI/skyvern',
    stars: '21k',
    description: 'LLM + computer vision platform for complex automation workflows',
    category: 'browser',
    icon: 'eye',
    color: 'text-purple-400',
    highlights: ['No selectors', 'CAPTCHA solving', 'Self-adapting'],
  },
  {
    name: 'Maxun',
    repo: 'getmaxun/maxun',
    stars: '15k',
    description: 'No-code AI platform turning websites into structured APIs',
    category: 'browser',
    icon: 'layout',
    color: 'text-rose-400',
    highlights: ['Self-healing', 'No-code', 'API generation'],
  },
  {
    name: 'Nanobrowser',
    repo: 'nicholasgriffintn/nanobrowser',
    stars: '13k',
    description: 'Privacy-centric Chrome extension for multi-agent AI automation',
    category: 'browser',
    icon: 'chrome',
    color: 'text-blue-400',
    highlights: ['Privacy-first', 'Multi-agent', 'Own API keys'],
  },
  {
    name: 'Stagehand',
    repo: 'browserbase/stagehand',
    stars: '12k',
    description: 'Next-gen orchestration for AI-controlled browsers with visual programming',
    category: 'browser',
    icon: 'wand',
    color: 'text-indigo-400',
    highlights: ['Visual builder', 'Multi-agent', 'Enterprise'],
  },

  // AI Coding Agents
  {
    name: 'OpenHands',
    repo: 'All-Hands-AI/OpenHands',
    stars: '45k',
    description: 'Multi-agent framework for autonomous software engineering',
    category: 'agent',
    icon: 'hand',
    color: 'text-amber-400',
    highlights: ['87% PR acceptance', 'Multi-agent', 'Full repo autonomy'],
  },
  {
    name: 'AutoGen',
    repo: 'microsoft/autogen',
    stars: '35k',
    description: 'Microsoft\'s framework for conversational multi-agent developer systems',
    category: 'agent',
    icon: 'bot',
    color: 'text-purple-400',
    highlights: ['Microsoft-backed', 'Multi-agent', 'Enterprise ready'],
  },
  {
    name: 'CrewAI',
    repo: 'crewAIInc/crewAI',
    stars: '25k',
    description: 'Team of AI agents workflow with planner, coder, reviewer roles',
    category: 'agent',
    icon: 'users',
    color: 'text-cyan-400',
    highlights: ['Role-based', 'Collaborative', 'Task delegation'],
  },
  {
    name: 'Aider',
    repo: 'paul-gauthier/aider',
    stars: '22k',
    description: 'CLI-based AI pair programmer that edits code in your local repo',
    category: 'agent',
    icon: 'terminal',
    color: 'text-green-400',
    highlights: ['Local-first', 'Git-aware', 'Privacy control'],
  },
  {
    name: 'SWE-Agent',
    repo: 'princeton-nlp/SWE-agent',
    stars: '18k',
    description: 'Autonomous agent for bug fixes, code reviews, and generation',
    category: 'agent',
    icon: 'bug',
    color: 'text-red-400',
    highlights: ['Bug fixing', 'Code review', 'Test generation'],
  },

  // Orchestration
  {
    name: 'LangChain',
    repo: 'langchain-ai/langchain',
    stars: '95k',
    description: 'Swiss Army knife for chaining LLMs, APIs, and tools into agents',
    category: 'orchestration',
    icon: 'link',
    color: 'text-emerald-400',
    highlights: ['Composable', 'Tool integration', 'RAG support'],
  },
  {
    name: 'n8n',
    repo: 'n8n-io/n8n',
    stars: '50k',
    description: 'Visual no-code workflow automation with native LLM support',
    category: 'orchestration',
    icon: 'workflow',
    color: 'text-orange-400',
    highlights: ['Visual builder', '400+ integrations', 'Self-hosted'],
  },
  {
    name: 'Langflow',
    repo: 'langflow-ai/langflow',
    stars: '35k',
    description: 'Drag-and-drop visual designer for agentic RAG workflows',
    category: 'orchestration',
    icon: 'sparkles',
    color: 'text-violet-400',
    highlights: ['Visual RAG', 'Code-free', 'Python export'],
  },
  {
    name: 'Daytona',
    repo: 'daytonaio/daytona',
    stars: '15k',
    description: 'Secure infrastructure for executing AI-generated code',
    category: 'orchestration',
    icon: 'container',
    color: 'text-blue-400',
    highlights: ['Secure sandboxes', 'Git integration', 'Multi-cloud'],
  },
];

const CATEGORIES = [
  { id: 'all' as const, label: 'All', icon: 'layers', color: 'text-primary' },
  { id: 'browser' as const, label: 'Browser Automation', icon: 'monitor', color: 'text-pink-400' },
  { id: 'agent' as const, label: 'AI Coding Agents', icon: 'bot', color: 'text-amber-400' },
  { id: 'orchestration' as const, label: 'Orchestration', icon: 'git-branch', color: 'text-teal-400' },
];

type CategoryFilter = 'all' | TrendingRepo['category'];

export default function TrendingReposPanel() {
  const [filter, setFilter] = useState<CategoryFilter>('all');

  const filtered = filter === 'all' ? TRENDING_REPOS : TRENDING_REPOS.filter(r => r.category === filter);
  const totalStars = TRENDING_REPOS.reduce((sum, r) => sum + parseInt(r.stars.replace('k', '000')), 0);

  return (
    <div className="w-full rounded-2xl border border-border/30 bg-background/20 overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-border/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-pink-400" />
            <h3 className="text-sm font-bold text-foreground">Trending GitHub Repos 2025</h3>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] font-bold text-amber-400">
            <Star className="w-2.5 h-2.5" />
            {Math.round(totalStars / 1000)}k+ Total Stars
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Top open-source projects powering the next generation of AI browser automation and coding agents.
        </p>
      </div>

      {/* Category Filter */}
      <div className="px-4 sm:px-6 py-3 border-b border-border/20 flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
              filter === cat.id
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'bg-muted/30 text-muted-foreground border border-transparent hover:border-border/40 hover:text-foreground'
            }`}
          >
            <AppIcon name={cat.icon} className={`w-3 h-3 ${filter === cat.id ? 'text-primary' : cat.color}`} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Repos Grid */}
      <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[520px] overflow-y-auto">
        {filtered.map(repo => (
          <a
            key={repo.name}
            href={`https://github.com/${repo.repo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group p-3 rounded-xl border border-pink-500/20 bg-pink-500/5 hover:border-pink-500/40 hover:bg-pink-500/10 transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]"
          >
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-pink-500/10">
                <AppIcon name={repo.icon} className={`w-4 h-4 ${repo.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-foreground">{repo.name}</span>
                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Star className="w-2 h-2" />
                    {repo.stars}
                  </span>
                  <ArrowUpRight className="w-3 h-3 text-muted-foreground/40 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                  {repo.description}
                </p>
              </div>
            </div>

            {/* Highlights */}
            <div className="mt-2 flex flex-wrap gap-1">
              {repo.highlights.map((h, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded text-[8px] font-medium bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  {h}
                </span>
              ))}
            </div>

            {/* Repo path */}
            <div className="mt-2 flex items-center gap-1 text-[9px] text-muted-foreground/60">
              <GitFork className="w-2.5 h-2.5" />
              <span className="truncate">{repo.repo}</span>
            </div>
          </a>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-6 py-3 border-t border-border/20 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-muted-foreground">
          {filtered.length} repositories · Updated April 2025
        </span>
        <a
          href="https://github.com/topics/browser-automation"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] text-pink-400 hover:text-pink-300 transition-colors"
        >
          <ExternalLink className="w-2.5 h-2.5" />
          Explore more on GitHub
        </a>
      </div>
    </div>
  );
}
