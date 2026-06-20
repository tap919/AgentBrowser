'use client';

import {
  FileText, Shield, BarChart2, FolderOpen, PartyPopper, Boxes,
  CheckCircle2, Circle, Code2, Wind, Database, Server, Cloud,
  Zap, Atom, Monitor, Eye, Bot, Globe,
} from 'lucide-react';

import type { LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';

interface DeliverablesProps {
  projectName: string;
  techStack: string[];
  metrics: {
    linesOfCode: number;
    filesCreated: number;
    testsPassing: number;
    securityScore: number;
  };
}

const TECH_ICONS: Record<string, { icon: ComponentType<LucideProps>; color: string }> = {
  'Next.js': { icon: Code2, color: 'text-white' },
  'TypeScript': { icon: Code2, color: 'text-blue-400' },
  'Tailwind CSS': { icon: Wind, color: 'text-cyan-400' },
  'Prisma': { icon: Database, color: 'text-emerald-400' },
  'Node.js': { icon: Server, color: 'text-green-400' },
  'React': { icon: Atom, color: 'text-cyan-300' },
  'PostgreSQL': { icon: Database, color: 'text-blue-300' },
  'SQLite': { icon: Database, color: 'text-blue-200' },
  'Vercel': { icon: Cloud, color: 'text-white' },
  'Supabase': { icon: Zap, color: 'text-emerald-300' },
  'Redis': { icon: Server, color: 'text-red-400' },
  'Playwright': { icon: Monitor, color: 'text-green-400' },
  'Puppeteer': { icon: Globe, color: 'text-cyan-400' },
  'Selenium': { icon: Globe, color: 'text-blue-400' },
  'Skyvern': { icon: Eye, color: 'text-purple-400' },
  'BrowserUse': { icon: Bot, color: 'text-pink-400' },
  'Firecrawl': { icon: Zap, color: 'text-orange-400' },
};

const ARTIFACTS: { icon: ComponentType<LucideProps>; color: string; bg: string; name: string; description: string }[] = [
  { icon: FolderOpen, color: 'text-purple-400', bg: 'bg-purple-500/10', name: 'Source Code', description: 'Complete project scaffold with all source files' },
  { icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/10', name: 'Documentation', description: 'README, API reference & deployment guide' },
  { icon: Shield, color: 'text-orange-400', bg: 'bg-orange-500/10', name: 'Security Report', description: 'Full audit report with all checks' },
  { icon: Server, color: 'text-cyan-400', bg: 'bg-cyan-500/10', name: 'Deployment Config', description: 'Dockerfile, CI/CD, and cloud configuration' },
  { icon: BarChart2, color: 'text-pink-400', bg: 'bg-pink-500/10', name: 'Performance Report', description: 'Bundle analysis and optimization recommendations' },
];

const BUILD_PHASES = [
  'AI Research & Planning',
  'Requirements Analysis',
  'System Design',
  'Project Foundation',
  'Browser Engine',
  'Core Features',
  'Quality Audit',
  'AI Layer',
  'Remaining Features',
  'Performance Optimization',
  'Full Audit',
  'Deployment Config',
];

export default function Deliverables({ projectName, techStack, metrics }: DeliverablesProps) {
  const completedPhases = BUILD_PHASES.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold mb-3">
          <PartyPopper className="w-4 h-4" />
          Project Build Complete
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">{projectName}</h2>
        <p className="text-sm text-muted-foreground mt-1">All 12 build phases completed successfully</p>
      </div>

      {/* Artifacts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ARTIFACTS.map((art, i) => (
          <div
            key={i}
            className="group p-4 rounded-xl border border-border/30 bg-background/20 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300"
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg ${art.bg} flex items-center justify-center flex-shrink-0`}>
                <art.icon className={`w-5 h-5 ${art.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{art.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{art.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tech Stack */}
      <div className="p-4 rounded-xl border border-border/30 bg-background/20">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Boxes className="w-3.5 h-3.5 text-primary" />
          Tech Stack
        </h3>
        <div className="flex flex-wrap gap-2">
          {techStack.map((tech, i) => {
            const meta = TECH_ICONS[tech] || { icon: Code2, color: 'text-muted-foreground' };
            return (
              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background/30 border border-border/20 text-xs font-medium text-foreground/80 hover:border-primary/30 transition-colors">
                <meta.icon className={`w-3 h-3 ${meta.color}`} />
                {tech}
              </span>
            );
          })}
        </div>
      </div>

      {/* Stats & Build Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Project Statistics */}
        <div className="p-4 rounded-xl border border-border/30 bg-background/20">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
            Project Statistics
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 rounded-lg bg-background/30">
              <div className="text-xl font-bold text-purple-400">{metrics.linesOfCode.toLocaleString()}</div>
              <div className="text-[9px] text-muted-foreground uppercase">Lines of Code</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-background/30">
              <div className="text-xl font-bold text-cyan-400">{metrics.filesCreated}</div>
              <div className="text-[9px] text-muted-foreground uppercase">Files Created</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-background/30">
              <div className="text-xl font-bold text-emerald-400">{metrics.testsPassing}</div>
              <div className="text-[9px] text-muted-foreground uppercase">Tests Passing</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-background/30">
              <div className="text-xl font-bold text-amber-400">{metrics.securityScore}/100</div>
              <div className="text-[9px] text-muted-foreground uppercase">Security Score</div>
            </div>
          </div>
        </div>

        {/* Build Summary */}
        <div className="p-4 rounded-xl border border-border/30 bg-background/20">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Build Summary
          </h3>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="text-foreground/80">{completedPhases} of {BUILD_PHASES.length} phases completed</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="text-foreground/80">Project scaffold in workspace directory</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="text-foreground/80">Source code with TypeScript and Next.js</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="text-foreground/80">Security audit and performance report</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="text-foreground/80">Docker and CI/CD configuration</span>
            </div>
            {metrics.securityScore < 80 && (
              <div className="flex items-center gap-2 text-xs mt-2 p-2 rounded-lg bg-amber-500/10">
                <Circle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span className="text-amber-400/80">Security score below threshold — review audit findings</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
