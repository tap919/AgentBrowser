'use client';

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

const TECH_ICONS: Record<string, { icon: string; color: string }> = {
  'Next.js': { icon: 'fa-n', color: 'text-white' },
  'TypeScript': { icon: 'fa-code', color: 'text-blue-400' },
  'Tailwind CSS': { icon: 'fa-wind', color: 'text-cyan-400' },
  'Prisma': { icon: 'fa-database', color: 'text-emerald-400' },
  'Node.js': { icon: 'fa-node-js', color: 'text-green-400' },
  'React': { icon: 'fa-atom', color: 'text-cyan-300' },
  'PostgreSQL': { icon: 'fa-database', color: 'text-blue-300' },
  'SQLite': { icon: 'fa-database', color: 'text-blue-200' },
  'Vercel': { icon: 'fa-cloud', color: 'text-white' },
  'Supabase': { icon: 'fa-bolt', color: 'text-emerald-300' },
  'Redis': { icon: 'fa-server', color: 'text-red-400' },
};

const DELIVERABLES = [
  { icon: 'fa-globe', color: 'text-emerald-400', bg: 'bg-emerald-500/10', name: 'Live Application', descType: 'url' },
  { icon: 'fa-code-branch', color: 'text-purple-400', bg: 'bg-purple-500/10', name: 'Source Code', descType: 'repo' },
  { icon: 'fa-database', color: 'text-cyan-400', bg: 'bg-cyan-500/10', name: 'Database', descType: 'db' },
  { icon: 'fa-file-lines', color: 'text-amber-400', bg: 'bg-amber-500/10', name: 'Documentation', descType: 'docs' },
  { icon: 'fa-chart-line', color: 'text-pink-400', bg: 'bg-pink-500/10', name: 'Analytics', descType: 'analytics' },
  { icon: 'fa-shield-halved', color: 'text-orange-400', bg: 'bg-orange-500/10', name: 'Security Report', descType: 'security' },
];

const CHECKLIST_ITEMS = [
  { label: 'Production deployment verified', done: true },
  { label: 'SSL certificate active', done: true },
  { label: 'Database migrations applied', done: true },
  { label: 'Environment variables configured', done: true },
  { label: 'Health checks passing', done: true },
  { label: 'Error monitoring enabled', done: true },
  { label: 'Performance benchmarks met', done: true },
  { label: 'Security scan cleared', done: true },
];

export default function Deliverables({ projectName, techStack, metrics }: DeliverablesProps) {
  const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const getDeliverableDesc = (descType: string) => {
    switch (descType) {
      case 'url': return `https://${slug}.vercel.app`;
      case 'repo': return `github.com/agentbrowser/${slug}`;
      case 'db': return `supabase.com/dashboard/project/${slug}`;
      case 'docs': return 'README, API reference & deployment guide';
      case 'analytics': return `vercel.com/dashboard/analytics/${slug}`;
      case 'security': return 'Full audit report with all checks';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold mb-3">
          <i className="fa-solid fa-party-horn" />
          Project Delivered Successfully
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">{projectName}</h2>
        <p className="text-sm text-muted-foreground mt-1">Your project is live and ready to use</p>
      </div>

      {/* Deliverables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {DELIVERABLES.map((del, i) => (
          <div
            key={i}
            className="group p-4 rounded-xl border border-border/30 bg-background/20 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg ${del.bg} flex items-center justify-center flex-shrink-0`}>
                <i className={`fa-solid ${del.icon} ${del.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{del.name}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">{getDeliverableDesc(del.descType)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tech Stack */}
      <div className="p-4 rounded-xl border border-border/30 bg-background/20">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <i className="fa-solid fa-cubes text-primary" />
          Tech Stack
        </h3>
        <div className="flex flex-wrap gap-2">
          {techStack.map((tech, i) => {
            const meta = TECH_ICONS[tech] || { icon: 'fa-circle-dot', color: 'text-muted-foreground' };
            return (
              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background/30 border border-border/20 text-xs font-medium text-foreground/80 hover:border-primary/30 transition-colors">
                <i className={`fa-solid ${meta.icon} ${meta.color} text-[10px]`} />
                {tech}
              </span>
            );
          })}
        </div>
      </div>

      {/* Stats & Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Project Statistics */}
        <div className="p-4 rounded-xl border border-border/30 bg-background/20">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <i className="fa-solid fa-chart-bar text-cyan-400" />
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

        {/* Deployment Checklist */}
        <div className="p-4 rounded-xl border border-border/30 bg-background/20">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <i className="fa-solid fa-clipboard-check text-emerald-400" />
            Deployment Checklist
          </h3>
          <div className="space-y-1.5">
            {CHECKLIST_ITEMS.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <i className={`fa-solid ${item.done ? 'fa-check-circle text-emerald-400' : 'fa-circle text-muted-foreground/30'}`} />
                <span className={item.done ? 'text-foreground/80' : 'text-muted-foreground'}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Architecture Diagram (simplified) */}
      <div className="p-4 rounded-xl border border-border/30 bg-background/20">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <i className="fa-solid fa-diagram-project text-purple-400" />
          System Architecture
        </h3>
        <div className="flex flex-col items-center gap-2">
          {/* Client Layer */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <div className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-mono text-cyan-400">Next.js Frontend</div>
          </div>
          <div className="w-px h-4 bg-border/30" />
          <i className="fa-solid fa-arrows-up-down text-[8px] text-muted-foreground/40" />
          <div className="w-px h-4 bg-border/30" />
          {/* API Layer */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <div className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[10px] font-mono text-purple-400">API Routes</div>
            <div className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[10px] font-mono text-purple-400">Auth Middleware</div>
          </div>
          <div className="w-px h-4 bg-border/30" />
          <i className="fa-solid fa-arrows-up-down text-[8px] text-muted-foreground/40" />
          <div className="w-px h-4 bg-border/30" />
          {/* Data Layer */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400">Prisma ORM</div>
            <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] font-mono text-amber-400">PostgreSQL</div>
            <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] font-mono text-red-400">Redis Cache</div>
          </div>
          <div className="w-px h-4 bg-border/30" />
          <i className="fa-solid fa-arrows-up-down text-[8px] text-muted-foreground/40" />
          <div className="w-px h-4 bg-border/30" />
          {/* Infrastructure */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <div className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[10px] font-mono text-blue-400">Vercel Edge</div>
            <div className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[10px] font-mono text-blue-400">CDN</div>
            <div className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-[10px] font-mono text-orange-400">Monitoring</div>
          </div>
        </div>
      </div>
    </div>
  );
}
