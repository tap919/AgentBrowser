'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Hexagon, Plus, Shield, Route, Brain, Play, Check, Wrench, CheckCheck, PartyPopper, CheckCircle2
} from 'lucide-react';
import ParticleBackground from '@/components/ParticleBackground';
import ProjectForm, { ProjectData } from '@/components/ProjectForm';
import AIAnalysisCard, { AIAnalysis } from '@/components/AIAnalysisCard';
import PipelinePhase, { PhaseData } from '@/components/PipelinePhase';
import MetricsPanel, { Metrics } from '@/components/MetricsPanel';
import ActivityLog, { LogEntry } from '@/components/ActivityLog';
import AuditPanel, { Finding } from '@/components/AuditPanel';
import Deliverables from '@/components/Deliverables';
import ThemeToggle from '@/components/ThemeToggle';

/* ═══════════════════════════════════════════
   PIPELINE PHASES DEFINITION (10 phases)
   ═══════════════════════════════════════════ */
const PHASES_DEF = [
  {
    id: 1, name: 'AI Research & Planning', icon: 'brain', type: 'build' as const,
    desc: 'The AI research agent analyzes your requirements, researches best practices, and creates a comprehensive implementation plan.',
    subs: ['Analyze project requirements in depth', 'Research similar projects and patterns', 'Identify optimal architecture patterns', 'Create detailed implementation roadmap', 'Define acceptance criteria for each feature'],
  },
  {
    id: 2, name: 'Understand What You Need', icon: 'message-square', type: 'build' as const,
    desc: 'The system reads your project description and fills any gaps with intelligent defaults based on your project type.',
    subs: ['Parse your project description', 'Identify missing requirements', 'Generate complete feature list', 'Confirm project scope and constraints'],
  },
  {
    id: 3, name: 'Design the System', icon: 'compass', type: 'build' as const,
    desc: 'A senior architect agent designs the technical architecture, data models, API contracts, and component structure.',
    subs: ['Design database schema and models', 'Plan API endpoints and contracts', 'Define component hierarchy', 'Choose libraries and dependencies', 'Create file and folder structure'],
  },
  {
    id: 4, name: 'Set Up the Foundation', icon: 'layers', type: 'build' as const,
    desc: 'The scaffolding agent creates the project, initializes the codebase, and configures all services and tooling.',
    subs: ['Initialize project repository', 'Set up framework and build tooling', 'Configure database and migrations', 'Set up authentication system', 'Connect deployment platform'],
  },
  {
    id: 5, name: 'Build Core Features', icon: 'box', type: 'build' as const,
    desc: 'The coder agent implements the main features — the parts your users will interact with most.',
    subs: ['Implement user authentication flow', 'Build main data models and API', 'Create primary user interface', 'Connect front-end to back-end', 'Add input validation and error handling'],
  },
  {
    id: 6, name: 'Quality Gate: Core Audit', icon: 'shield', type: 'audit' as const,
    desc: 'Automatic audit of all core features. Security, race conditions, and type safety are verified before proceeding.',
    subs: ['Security vulnerability scan', 'Race condition detection', 'Type safety analysis', 'Auto-fix any issues found', 'Re-audit to confirm fixes'],
  },
  {
    id: 7, name: 'Build Remaining Features', icon: 'boxes', type: 'build' as const,
    desc: 'With the core verified, the coder builds out secondary features, edge cases, and polish.',
    subs: ['Implement secondary features', 'Add error handling and edge cases', 'Build settings and preferences', 'Create notification system', 'Add loading states and transitions'],
  },
  {
    id: 8, name: 'Performance Optimization', icon: 'gauge', type: 'build' as const,
    desc: 'Dedicated performance agent optimizes bundle size, rendering speed, and resource usage across the entire application.',
    subs: ['Analyze bundle size and tree-shake', 'Optimize rendering with memoization', 'Implement code splitting and lazy loading', 'Optimize database queries and indexing', 'Add caching at all layers'],
  },
  {
    id: 9, name: 'Quality Gate: Full Audit', icon: 'shield', type: 'audit' as const,
    desc: 'Complete 7-category audit of the entire project. Nothing ships with known critical issues.',
    subs: ['Static analysis and complexity scan', 'Security vulnerabilities deep scan', 'Code smells and duplication check', 'Race conditions and concurrency audit', 'Memory leak and resource cleanup check', 'Type safety and null check verification', 'Dependency health and CVE scan', 'Auto-fix everything possible', 'Final verification and sign-off'],
  },
  {
    id: 10, name: 'Deploy and Deliver', icon: 'rocket', type: 'build' as const,
    desc: 'The finished project is deployed, tested live, and documented. You receive working URLs and access credentials.',
    subs: ['Deploy to production environment', 'Run live health checks', 'Set up monitoring and alerts', 'Generate API documentation', 'Create handoff summary and guide'],
  },
];

/* ═══════════════════════════════════════════
   APP STATES
   ═══════════════════════════════════════════ */
type AppView = 'form' | 'analyzing' | 'analysis' | 'pipeline' | 'complete';

interface AppState {
  view: AppView;
  project: ProjectData | null;
  analysis: AIAnalysis | null;
  phases: PhaseData[];
  currentPhase: number;
  currentSubStep: number;
  metrics: Metrics;
  findings: Finding[];
  log: LogEntry[];
  confidence: number;
  pipelineRunning: boolean;
  techStack: string[];
}

/* ═══════════════════════════════════════════
   MAIN APP COMPONENT
   ═══════════════════════════════════════════ */
function AppContent() {
  const [state, setState] = useState<AppState>({
    view: 'form',
    project: null,
    analysis: null,
    phases: PHASES_DEF.map(p => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      status: 'pending' as const,
      progress: 0,
      subSteps: p.subs.map(s => ({ name: s, status: 'pending' as const })),
      estimatedTime: undefined,
    })),
    currentPhase: -1,
    currentSubStep: 0,
    metrics: { linesOfCode: 0, filesCreated: 0, testsPassing: 0, securityScore: 0 },
    findings: [],
    log: [],
    confidence: 0,
    pipelineRunning: false,
    techStack: [],
  });

  const pipelineTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pipelineTimerRef.current) clearTimeout(pipelineTimerRef.current);
      isRunningRef.current = false;
    };
  }, []);

  /* ─── Form Submit ─── */
  const handleFormSubmit = useCallback(async (data: ProjectData) => {
    setState(prev => ({ ...prev, view: 'analyzing', project: data }));

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: data.name,
          description: data.description,
          type: data.type,
          audience: data.audience,
        }),
      });

      if (!res.ok) throw new Error('Analysis failed');

      const { analysis } = await res.json();
      setState(prev => ({
        ...prev,
        view: 'analysis',
        analysis,
        techStack: analysis.techStack || ['Next.js', 'TypeScript', 'Tailwind CSS', 'Prisma', 'Node.js'],
      }));
    } catch (err) {
      console.error('AI analysis error:', err);
      // Fallback analysis
      setState(prev => ({
        ...prev,
        view: 'analysis',
        analysis: {
          summary: `A ${prev.project?.type || 'web application'} named "${prev.project?.name}" that ${prev.project?.description?.slice(0, 200) || 'provides core functionality'}. The system will be built with a modern stack focusing on performance, security, and user experience.`,
          architecture: {
            frontend: 'Next.js 15 with React 19, TypeScript, and Tailwind CSS',
            backend: 'Next.js API Routes with Prisma ORM',
            database: 'PostgreSQL via Supabase with Redis caching',
            infrastructure: 'Vercel Edge with CDN and monitoring',
          },
          features: prev.project?.description
            ? ['User authentication & authorization', 'Dashboard analytics', 'Real-time notifications', 'Data management CRUD', 'Search and filtering']
            : ['Core application features', 'User management', 'Data operations', 'API endpoints'],
          risks: [
            { name: 'Scope expansion', severity: 'medium', mitigation: 'MVP-first approach with iterative delivery' },
            { name: 'Performance under load', severity: 'low', mitigation: 'Caching strategy and load testing' },
          ],
          estimatedComplexity: 'medium',
          suggestedTimeline: '4-6 weeks for full delivery',
          techStack: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Prisma', 'Node.js'],
          keyComponents: ['Auth Module', 'Core API', 'Dashboard UI', 'Database Layer', 'Deploy Pipeline'],
        },
        techStack: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Prisma', 'Node.js'],
      }));
    }
  }, []);

  /* ─── Start Build ─── */
  const handleStartBuild = useCallback(() => {
    setState(prev => ({ ...prev, view: 'pipeline', pipelineRunning: true }));
    toast('Build pipeline started', { description: 'Autonomous build is now running' });

    // Reset phases
    setState(prev => ({
      ...prev,
      phases: PHASES_DEF.map(p => ({
        id: p.id,
        name: p.name,
        icon: p.icon,
        status: 'pending' as const,
        progress: 0,
        subSteps: p.subs.map(s => ({ name: s, status: 'pending' as const })),
        estimatedTime: undefined,
      })),
      currentPhase: 0,
      currentSubStep: 0,
      confidence: 0,
      findings: [],
      log: [],
      metrics: { linesOfCode: 0, filesCreated: 0, testsPassing: 0, securityScore: 0 },
    }));

    isRunningRef.current = true;
    runPipeline();
  }, []);

  /* ─── Pipeline Simulation Engine ─── */
  const wait = (ms: number) => new Promise<void>(resolve => {
    pipelineTimerRef.current = setTimeout(resolve, ms);
  });

  const addLog = useCallback((text: string, icon: string, color: string, category: LogEntry['category'], detail?: string) => {
    const now = new Date();
    const time = now.getHours().toString().padStart(2, '0') + ':' +
                 now.getMinutes().toString().padStart(2, '0') + ':' +
                 now.getSeconds().toString().padStart(2, '0');
    setState(prev => ({
      ...prev,
      log: [...prev.log, {
        id: Math.random().toString(36).substring(2, 9),
        time, text, icon, color, category, detail,
      }],
    }));
  }, []);

  const addFinding = useCallback((finding: Omit<Finding, 'id'>) => {
    setState(prev => ({
      ...prev,
      findings: [...prev.findings, { ...finding, id: Math.random().toString(36).substring(2, 9) }],
    }));
  }, []);

  const generateAuditFindings = useCallback((phaseIdx: number, subStepIdx: number, subName: string) => {
    const phaseDef = PHASES_DEF[phaseIdx];
    const isSecondAudit = phaseDef.id === 9;

    if (subName.includes('Security')) {
      if (!isSecondAudit) {
        addFinding({ category: 'security', categoryIcon: 'shield', severity: 'high', title: 'Missing CSRF token on settings endpoint', location: 'api/routes.ts:156', fixed: false, phase: phaseDef.id });
        addFinding({ category: 'security', categoryIcon: 'shield', severity: 'medium', title: 'Rate limiting not configured on login', location: 'api/auth.ts:42', fixed: false, phase: phaseDef.id });
      } else {
        addFinding({ category: 'security', categoryIcon: 'shield', severity: 'pass', title: 'All security checks passed', location: 'Full scan', fixed: true, phase: phaseDef.id });
      }
    } else if (subName.includes('Race')) {
      if (!isSecondAudit) {
        addFinding({ category: 'raceConditions', categoryIcon: 'lock', severity: 'high', title: 'Token refresh race condition detected', location: 'auth/token.ts:47', fixed: false, phase: phaseDef.id });
      } else {
        addFinding({ category: 'raceConditions', categoryIcon: 'lock', severity: 'pass', title: 'No race conditions detected', location: 'Full scan', fixed: true, phase: phaseDef.id });
      }
    } else if (subName.includes('Type')) {
      addFinding({ category: 'typeSafety', categoryIcon: 'code', severity: 'medium', title: '2 unsafe type casts found and fixed', location: 'utils/transform.ts:5', fixed: false, phase: phaseDef.id });
      addFinding({ category: 'typeSafety', categoryIcon: 'code', severity: 'pass', title: 'All null checks verified', location: 'Full scan', fixed: true, phase: phaseDef.id });
    } else if (subName.includes('Static') || subName.includes('complexity')) {
      addFinding({ category: 'codeQuality', categoryIcon: 'gem', severity: 'low', title: 'Complex function simplified (complexity 18 → 7)', location: 'auth/login.ts:47', fixed: false, phase: phaseDef.id });
      addFinding({ category: 'codeQuality', categoryIcon: 'gem', severity: 'pass', title: 'No dead code detected', location: 'Full scan', fixed: true, phase: phaseDef.id });
    } else if (subName.includes('Smell') || subName.includes('duplication')) {
      addFinding({ category: 'codeQuality', categoryIcon: 'gem', severity: 'low', title: 'Duplicated validation extracted to shared utility', location: 'auth/middleware.ts:23', fixed: false, phase: phaseDef.id });
      addFinding({ category: 'codeQuality', categoryIcon: 'gem', severity: 'pass', title: 'No god classes detected', location: 'Full scan', fixed: true, phase: phaseDef.id });
    } else if (subName.includes('Memory') || subName.includes('resource')) {
      addFinding({ category: 'memorySafety', categoryIcon: 'cpu', severity: 'pass', title: 'No memory leaks detected', location: 'Full scan', fixed: true, phase: phaseDef.id });
    } else if (subName.includes('Dependency') || subName.includes('CVE')) {
      if (!isSecondAudit) {
        addFinding({ category: 'dependencies', categoryIcon: 'package', severity: 'high', title: '3 dependency CVEs found and patched', location: 'package.json', fixed: false, phase: phaseDef.id });
      } else {
        addFinding({ category: 'dependencies', categoryIcon: 'package', severity: 'pass', title: 'All dependencies up to date', location: 'Full scan', fixed: true, phase: phaseDef.id });
      }
    } else if (subName.includes('Auto-fix') || subName.includes('fix')) {
      addFinding({ category: 'codeQuality', categoryIcon: 'gem', severity: 'pass', title: 'All fixable issues resolved automatically', location: 'Auto-fix engine', fixed: true, phase: phaseDef.id });
    } else if (subName.includes('verification') || subName.includes('Re-audit') || subName.includes('Final') || subName.includes('sign-off')) {
      addFinding({ category: 'security', categoryIcon: 'shield', severity: 'pass', title: 'Verification scan: all clear', location: 'Full scan', fixed: true, phase: phaseDef.id });
    }
  }, [addFinding]);

  const runPipeline = async () => {
    for (let pi = 0; pi < PHASES_DEF.length; pi++) {
      if (!isRunningRef.current) return;

      const phaseDef = PHASES_DEF[pi];

      // Set phase to running
      setState(prev => {
        const phases = [...prev.phases];
        phases[pi] = { ...phases[pi], status: 'running', estimatedTime: `${phaseDef.subs.length * 3 + Math.floor(Math.random() * 8)}s` };
        return { ...prev, phases, currentPhase: pi, currentSubStep: 0 };
      });

      addLog(`Starting: ${phaseDef.name}`, 'play', 'text-purple-400', 'build');

      // Simulate sub-steps
      for (let si = 0; si < phaseDef.subs.length; si++) {
        if (!isRunningRef.current) return;

        setState(prev => {
          const phases = [...prev.phases];
          const subSteps = [...phases[pi].subSteps];
          subSteps[si] = { ...subSteps[si], status: 'running' };
          phases[pi] = { ...phases[pi], subSteps, progress: Math.round(((si) / phaseDef.subs.length) * 100) };
          return { ...prev, phases, currentSubStep: si };
        });

        await wait(800 + Math.random() * 1400);

        const subName = phaseDef.subs[si];

        if (phaseDef.type === 'audit') {
          // Generate findings
          generateAuditFindings(pi, si, subName);

          // Auto-fix non-pass findings for this phase
          await wait(400 + Math.random() * 600);
          setState(prev => {
            const newFindings = [...prev.findings];
            let autoFixed = 0;
            for (const f of newFindings) {
              if (f.phase === phaseDef.id && f.severity !== 'pass' && !f.fixed) {
                f.fixed = true;
                autoFixed++;
              }
            }
            if (autoFixed > 0) {
              addLog(`Auto-fixed ${autoFixed} issue${autoFixed > 1 ? 's' : ''}`, 'wrench', 'text-orange-400', 'fix');
            }
            return { ...prev, findings: newFindings };
          });
        } else {
          addLog(subName, 'check', 'text-emerald-400', 'build');
        }

        // Update metrics
        setState(prev => ({
          ...prev,
          metrics: {
            linesOfCode: prev.metrics.linesOfCode + Math.floor(Math.random() * 200) + 50,
            filesCreated: prev.metrics.filesCreated + (Math.random() > 0.5 ? 1 : 0),
            testsPassing: prev.metrics.testsPassing + (Math.random() > 0.6 ? 1 : 0),
            securityScore: Math.min(100, prev.metrics.securityScore + (phaseDef.type === 'audit' ? Math.floor(Math.random() * 15) + 5 : Math.floor(Math.random() * 3))),
          },
        }));

        // Mark sub-step as completed
        setState(prev => {
          const phases = [...prev.phases];
          const subSteps = [...phases[pi].subSteps];
          subSteps[si] = { ...subSteps[si], status: 'completed' };
          phases[pi] = { ...phases[pi], subSteps, progress: Math.round(((si + 1) / phaseDef.subs.length) * 100) };
          return { ...prev, phases, currentSubStep: si + 1 };
        });
      }

      // Phase complete
      if (phaseDef.type === 'audit') {
        // Check for any remaining critical issues
        setState(prev => {
          const criticals = prev.findings.filter(f => f.phase === phaseDef.id && f.severity === 'critical');
          if (criticals.length > 0) {
            addLog(`Audit gate: ${criticals.length} critical issue(s) — auto-fixing`, 'shield', 'text-red-400', 'audit');
            const newFindings = [...prev.findings];
            for (const f of newFindings) {
              if (f.phase === phaseDef.id && f.severity === 'critical') {
                f.fixed = true;
                f.severity = 'pass';
              }
            }
            addLog('All critical issues resolved', 'check-circle', 'text-emerald-400', 'fix');
            return { ...prev, findings: newFindings };
          } else {
            addLog(`Audit gate passed — no critical issues`, 'shield', 'text-emerald-400', 'audit');
            return prev;
          }
        });
      } else {
        addLog(`Completed: ${phaseDef.name}`, 'check-check', 'text-emerald-400', 'build');
      }

      // Mark phase as completed
      setState(prev => {
        const phases = [...prev.phases];
        phases[pi] = { ...phases[pi], status: 'completed', progress: 100 };
        const confidence = Math.min(100, Math.round(((pi + 1) / PHASES_DEF.length) * 100));
        return { ...prev, phases, confidence };
      });
    }

    // Pipeline complete
    isRunningRef.current = false;
    setState(prev => ({
      ...prev,
      pipelineRunning: false,
      confidence: 100,
      metrics: { ...prev.metrics, securityScore: 97 },
    }));
    addLog('Project complete and delivered!', 'party-popper', 'text-purple-400', 'deploy');
    addToast({ title: 'Project Delivered!', description: 'Your project is built, audited, and live.', variant: 'success' });

    // Switch to complete view after a delay
    await wait(2000);
    setState(prev => ({ ...prev, view: 'complete' }));
  };

  /* ─── New Project ─── */
  const handleNewProject = useCallback(() => {
    isRunningRef.current = false;
    if (pipelineTimerRef.current) clearTimeout(pipelineTimerRef.current);
    setState(prev => ({
      ...prev,
      view: 'form',
      project: null,
      analysis: null,
      phases: PHASES_DEF.map(p => ({
        id: p.id,
        name: p.name,
        icon: p.icon,
        status: 'pending' as const,
        progress: 0,
        subSteps: p.subs.map(s => ({ name: s, status: 'pending' as const })),
        estimatedTime: undefined,
      })),
      currentPhase: -1,
      currentSubStep: 0,
      metrics: { linesOfCode: 0, filesCreated: 0, testsPassing: 0, securityScore: 0 },
      findings: [],
      log: [],
      confidence: 0,
      pipelineRunning: false,
      techStack: [],
    }));
  }, []);

  /* ─── Manual Audit ─── */
  const handleRunAudit = useCallback(() => {
    if (state.pipelineRunning) return;
    toast.warning('Manual audit triggered', { description: 'Running full audit across all code' });
    addLog('Manual audit triggered by user', 'shield', 'text-amber-400', 'audit');

    // Simulate audit findings
    const categories = ['security', 'performance', 'typeSafety', 'codeQuality', 'raceConditions', 'memorySafety', 'dependencies'] as const;
    for (const cat of categories) {
      addFinding({
        category: cat,
        categoryIcon: categoryMeta[cat]?.icon || 'dot',
        severity: 'pass',
        title: `${cat} check passed`,
        location: 'Full scan',
        fixed: true,
        phase: 0,
      });
    }

    setState(prev => ({
      ...prev,
      metrics: { ...prev.metrics, securityScore: Math.min(100, prev.metrics.securityScore + 5) },
    }));
  }, [state.pipelineRunning, addLog, addFinding]);

  /* ─── Computed values ─── */
  const auditScore = state.findings.length > 0
    ? Math.round((state.findings.filter(f => f.severity === 'pass').length / state.findings.length) * 100)
    : 0;

  const totalChecks = state.findings.length;
  const passedChecks = state.findings.filter(f => f.severity === 'pass').length;

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ParticleBackground />

      {/* ─── Top Bar ─── */}
      <header className="relative z-40 flex items-center gap-3 px-4 sm:px-6 h-14 border-b border-border/30 glass-strong flex-shrink-0">
        <div className="flex items-center gap-2">
          <Hexagon className="w-5 h-5 text-primary" />
          <span className="text-sm font-bold tracking-tight">
            Agent<span className="text-primary">Browser</span>
          </span>
        </div>

        <div className="w-px h-6 bg-border/30 mx-1 hidden sm:block" />

        {/* Project selector */}
        <button
          onClick={handleNewProject}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/30 bg-background/30 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-200"
        >
          <Plus className="w-2.5 h-2.5" />
          <span className="hidden sm:inline truncate max-w-[160px]">
            {state.project?.name || 'New Project'}
          </span>
        </button>

        <div className="flex-1" />

        {/* Confidence Badge */}
        {state.confidence > 0 && (
          <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${
            state.confidence >= 90
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : state.confidence >= 60
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${state.confidence >= 90 ? 'bg-emerald-400' : state.confidence >= 60 ? 'bg-amber-400' : 'bg-red-400'} animate-pulse`} />
            {state.confidence}% Complete
          </div>
        )}

        {/* Phase indicator */}
        {state.view === 'pipeline' && state.currentPhase >= 0 && (
          <span className="hidden md:inline text-[10px] text-muted-foreground font-mono">
            Phase {state.currentPhase + 1}/{PHASES_DEF.length}
          </span>
        )}

        {/* Audit Button */}
        {state.view === 'pipeline' && state.currentPhase > 0 && (
          <button
            onClick={handleRunAudit}
            disabled={state.pipelineRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Shield className="w-2.5 h-2.5" />
            <span className="hidden sm:inline">Run Audit</span>
          </button>
        )}

        <div className="w-px h-6 bg-border/30 mx-1 hidden sm:block" />

        <ThemeToggle />

        <button
          onClick={handleNewProject}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, oklch(0.55 0.22 280), oklch(0.5 0.18 260))' }}
        >
          <Plus className="w-2.5 h-2.5" />
          <span className="hidden sm:inline">New</span>
        </button>
      </header>

      {/* ─── Main Content ─── */}
      <main className="relative z-10 flex-1 overflow-y-auto">
        {/* FORM VIEW */}
        {state.view === 'form' && (
          <div className="min-h-full flex items-center justify-center p-4 sm:p-8">
            <ProjectForm onSubmit={handleFormSubmit} isAnalyzing={false} />
          </div>
        )}

        {/* ANALYZING VIEW */}
        {state.view === 'analyzing' && (
          <div className="min-h-full flex items-center justify-center p-4 sm:p-8">
            <div className="text-center animate-fade-in-up">
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, oklch(0.55 0.22 280), oklch(0.6 0.2 190))' }}>
                  <Brain className="w-6 h-6 text-white animate-pulse" />
                </div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-primary/20 animate-ping opacity-30" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">AI is analyzing your project</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Our AI architect is reviewing your requirements, researching best practices, and creating a comprehensive project blueprint.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: `${i * 200}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ANALYSIS VIEW */}
        {state.view === 'analysis' && state.analysis && (
          <div className="min-h-full flex items-center justify-center p-4 sm:p-8">
            <AIAnalysisCard
              analysis={state.analysis}
              onStart={handleStartBuild}
              isStarting={false}
            />
          </div>
        )}

        {/* PIPELINE VIEW */}
        {state.view === 'pipeline' && (
          <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in-up">
            {/* Project header */}
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">{state.project?.name}</h1>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-lg truncate">
                {state.project?.description || 'Building your project...'}
              </p>
            </div>

            {/* Metrics */}
            <MetricsPanel metrics={state.metrics} isRunning={state.pipelineRunning} />

            {/* Pipeline + Audit Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Pipeline Phases */}
              <div className="lg:col-span-2 space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Route className="w-3.5 h-3.5 text-primary" />
                    Build Pipeline
                  </h2>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {state.phases.filter(p => p.status === 'completed').length}/{PHASES_DEF.length} complete
                  </span>
                </div>
                <div className="space-y-2">
                  {state.phases.map((phase, i) => (
                    <PipelinePhase
                      key={phase.id}
                      phase={phase}
                      isActive={i === state.currentPhase}
                      isLast={i === PHASES_DEF.length - 1}
                      onClick={() => {}}
                    />
                  ))}
                </div>
              </div>

              {/* Audit Panel */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    Audit Status
                  </h2>
                  <AuditPanel
                    findings={state.findings}
                    auditScore={auditScore}
                    totalChecks={totalChecks}
                    passedChecks={passedChecks}
                  />
                </div>
              </div>
            </div>

            {/* Activity Log */}
            <ActivityLog entries={state.log} />
          </div>
        )}

        {/* COMPLETE VIEW */}
        {state.view === 'complete' && state.project && (
          <div className="max-w-5xl mx-auto p-4 sm:p-6 animate-fade-in-up">
            <Deliverables
              projectName={state.project.name}
              techStack={state.techStack}
              metrics={state.metrics}
            />

            {/* Activity Log at bottom */}
            <div className="mt-6">
              <ActivityLog entries={state.log} />
            </div>

            {/* Start New Project */}
            <div className="mt-6 text-center">
              <button
                onClick={handleNewProject}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-300 hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, oklch(0.55 0.22 280), oklch(0.6 0.2 190), oklch(0.55 0.18 160))' }}
              >
                <Plus className="w-4 h-4" />
                Start New Project
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const categoryMeta: Record<string, { icon: string }> = {
  security: { icon: 'shield' },
  performance: { icon: 'zap' },
  typeSafety: { icon: 'code' },
  codeQuality: { icon: 'gem' },
  raceConditions: { icon: 'lock' },
  memorySafety: { icon: 'cpu' },
  dependencies: { icon: 'package' },
};

/* ═══════════════════════════════════════════
   ROOT EXPORT WITH PROVIDERS
   ═══════════════════════════════════════════ */
export default function Home() {
  return <AppContent />;
}
