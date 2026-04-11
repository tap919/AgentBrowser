'use client';

import { useState } from 'react';
import { AppIcon } from '@/lib/icons';
import { ChevronRight, ExternalLink } from 'lucide-react';

export interface ToolInfo {
  name: string;
  icon: string;
  color: string;
  description: string;
  strengths: string[];
  category: 'browser-automation' | 'ai-powered' | 'no-code';
  integrated: boolean;
}

const TOOLS: ToolInfo[] = [
  // Browser Automation Frameworks
  {
    name: 'Playwright',
    icon: 'monitor',
    color: 'text-green-400',
    description: 'Cross-browser testing with Chromium, Firefox, and WebKit via a single API.',
    strengths: ['Multi-browser', 'Auto-wait', 'Network interception', 'Video recording'],
    category: 'browser-automation',
    integrated: true,
  },
  {
    name: 'Selenium',
    icon: 'globe',
    description: 'The original open-source browser automation framework supporting every major browser.',
    color: 'text-blue-400',
    strengths: ['Universal browser support', 'Multi-language bindings', 'Mature ecosystem', 'Grid support'],
    category: 'browser-automation',
    integrated: true,
  },
  {
    name: 'Puppeteer',
    icon: 'mouse-pointer',
    color: 'text-cyan-400',
    description: 'Node.js library controlling Chrome/Chromium via Chrome DevTools Protocol.',
    strengths: ['Fast execution', 'PDF generation', 'Screenshots', 'Dynamic content scraping'],
    category: 'browser-automation',
    integrated: true,
  },
  {
    name: 'Cypress',
    icon: 'test-tube',
    color: 'text-emerald-400',
    description: 'Excels at web testing with simple setup and a great debugging experience.',
    strengths: ['Time-travel debugging', 'Auto-reload', 'Network stubbing', 'Visual testing'],
    category: 'browser-automation',
    integrated: false,
  },
  // AI-Powered Automation
  {
    name: 'Skyvern',
    icon: 'eye',
    color: 'text-purple-400',
    description: 'Uses LLMs and computer vision to automate any website without custom selectors.',
    strengths: ['No selectors needed', 'Self-adapting', 'CAPTCHA solving', 'Anti-bot detection'],
    category: 'ai-powered',
    integrated: true,
  },
  {
    name: 'BrowserUse',
    icon: 'brain',
    color: 'text-pink-400',
    description: 'AI-driven browser interaction for orchestrating complex web workflows.',
    strengths: ['Natural language commands', 'Complex workflows', 'Context awareness', 'Multi-step tasks'],
    category: 'ai-powered',
    integrated: true,
  },
  {
    name: 'Firecrawl',
    icon: 'flame',
    color: 'text-orange-400',
    description: 'Combines scraping and browser automation for extracting structured data from dynamic sites.',
    strengths: ['Structured data extraction', 'Dynamic site support', 'Batch processing', 'API-first'],
    category: 'ai-powered',
    integrated: false,
  },
  // No-Code / Low-Code
  {
    name: 'Axiom.ai',
    icon: 'wand',
    color: 'text-violet-400',
    description: 'No-code browser bot builder — like Zapier for browsers.',
    strengths: ['Zero code needed', 'Cloud execution', 'Template library', 'Scheduling'],
    category: 'no-code',
    integrated: false,
  },
  {
    name: 'Browserflow',
    icon: 'workflow',
    color: 'text-teal-400',
    description: 'Chrome extension to build visual automation flows by recording clicks and actions.',
    strengths: ['Visual builder', 'Record & replay', 'Cloud runs', 'Data extraction'],
    category: 'no-code',
    integrated: false,
  },
  {
    name: 'Bardeen AI',
    icon: 'sparkles',
    color: 'text-yellow-400',
    description: 'AI-assisted no-code automation tool for browser workflows.',
    strengths: ['AI suggestions', 'App integrations', 'Pre-built playbooks', 'Scraping'],
    category: 'no-code',
    integrated: false,
  },
  {
    name: 'UIVision',
    icon: 'scan',
    color: 'text-lime-400',
    description: 'Free, runs locally — handles clicking buttons, scraping data, and filling forms.',
    strengths: ['Free & local', 'Visual automation', 'XPath & image find', 'Macro recording'],
    category: 'no-code',
    integrated: false,
  },
];

const CATEGORIES = [
  { id: 'all' as const, label: 'All Tools', icon: 'layers', color: 'text-primary' },
  { id: 'browser-automation' as const, label: 'Browser Automation', icon: 'monitor', color: 'text-green-400' },
  { id: 'ai-powered' as const, label: 'AI-Powered', icon: 'brain', color: 'text-purple-400' },
  { id: 'no-code' as const, label: 'No-Code / Low-Code', icon: 'wand', color: 'text-violet-400' },
];

type CategoryFilter = 'all' | ToolInfo['category'];

export default function ToolEcosystem() {
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  const filtered = filter === 'all' ? TOOLS : TOOLS.filter(t => t.category === filter);
  const integratedCount = TOOLS.filter(t => t.integrated).length;

  return (
    <div className="w-full rounded-2xl border border-border/30 bg-background/20 overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-border/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AppIcon name="plug" className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Tool Ecosystem</h3>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {integratedCount} Integrated
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          AgentBrowser leverages the best browser automation, AI-powered, and no-code tools available.
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

      {/* Tools Grid */}
      <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[420px] overflow-y-auto">
        {filtered.map(tool => {
          const isExpanded = expandedTool === tool.name;
          return (
            <button
              key={tool.name}
              onClick={() => setExpandedTool(isExpanded ? null : tool.name)}
              className={`text-left p-3 rounded-xl border transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                isExpanded
                  ? 'border-primary/40 bg-primary/5'
                  : tool.integrated
                  ? 'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/30'
                  : 'border-border/30 bg-background/30 hover:border-border/50'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  tool.integrated ? 'bg-emerald-500/10' : 'bg-muted/20'
                }`}>
                  <AppIcon name={tool.icon} className={`w-4 h-4 ${tool.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{tool.name}</span>
                    {tool.integrated && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        INTEGRATED
                      </span>
                    )}
                    <ChevronRight className={`w-2.5 h-2.5 text-muted-foreground/40 ml-auto flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                    {tool.description}
                  </p>
                </div>
              </div>

              {/* Expanded strengths */}
              {isExpanded && (
                <div className="mt-2.5 pt-2.5 border-t border-border/20 animate-fade-in-up">
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5">Key Strengths</div>
                  <div className="flex flex-wrap gap-1">
                    {tool.strengths.map((s, i) => (
                      <span key={i} className={`px-2 py-0.5 rounded-md text-[9px] font-medium ${
                        tool.integrated
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-muted/30 text-muted-foreground border border-border/20'
                      }`}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer stats */}
      <div className="px-4 sm:px-6 py-3 border-t border-border/20 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {filtered.length} tool{filtered.length !== 1 ? 's' : ''} · {filtered.filter(t => t.integrated).length} integrated
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[9px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Integrated
          </span>
          <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" /> Available
          </span>
        </div>
      </div>
    </div>
  );
}
