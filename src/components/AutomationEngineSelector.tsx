'use client';

import { AppIcon } from '@/lib/icons';

export interface EngineOption {
  id: string;
  name: string;
  icon: string;
  color: string;
  desc: string;
  browsers: string[];
  bestFor: string;
}

const ENGINES: EngineOption[] = [
  {
    id: 'playwright',
    name: 'Playwright',
    icon: 'monitor',
    color: 'text-green-400',
    desc: 'Cross-browser with auto-wait and network interception',
    browsers: ['Chromium', 'Firefox', 'WebKit'],
    bestFor: 'Cross-browser testing & automation',
  },
  {
    id: 'puppeteer',
    name: 'Puppeteer',
    icon: 'mouse-pointer',
    color: 'text-cyan-400',
    desc: 'Fast Chromium control via Chrome DevTools Protocol',
    browsers: ['Chromium'],
    bestFor: 'Scraping, PDFs & screenshots',
  },
  {
    id: 'selenium',
    name: 'Selenium',
    icon: 'globe',
    color: 'text-blue-400',
    desc: 'Universal browser support with multi-language bindings',
    browsers: ['Chrome', 'Firefox', 'Safari', 'Edge'],
    bestFor: 'Enterprise & legacy browser testing',
  },
  {
    id: 'skyvern',
    name: 'Skyvern AI',
    icon: 'eye',
    color: 'text-purple-400',
    desc: 'LLM + computer vision — no selectors needed',
    browsers: ['Any (vision-based)'],
    bestFor: 'Adaptive automation & CAPTCHA solving',
  },
];

interface AutomationEngineSelectorProps {
  selectedEngine: string;
  onSelect: (engineId: string) => void;
}

export default function AutomationEngineSelector({ selectedEngine, onSelect }: AutomationEngineSelectorProps) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground mb-3 block">
        <AppIcon name="bolt" className="inline-block w-3.5 h-3.5 mr-1.5 text-primary" />
        Automation Engine
      </label>
      <div className="grid grid-cols-2 gap-2">
        {ENGINES.map(engine => (
          <button
            key={engine.id}
            type="button"
            onClick={() => onSelect(engine.id)}
            className={`p-3 rounded-xl border text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
              selectedEngine === engine.id
                ? 'border-primary/50 bg-primary/10 shadow-sm glow-purple'
                : 'border-border/50 bg-background/30 hover:border-primary/30 hover:bg-primary/5'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <AppIcon name={engine.icon} className={`w-4 h-4 ${engine.color}`} />
              <span className="text-xs font-semibold text-foreground">{engine.name}</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-snug mb-2">{engine.desc}</p>
            <div className="flex flex-wrap gap-1">
              {engine.browsers.map(b => (
                <span key={b} className="px-1.5 py-0.5 rounded text-[8px] font-medium bg-muted/30 text-muted-foreground border border-border/20">
                  {b}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
