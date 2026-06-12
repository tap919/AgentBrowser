'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Hexagon, Plus, Shield, Settings2, Bot,
} from 'lucide-react';
import { toast } from 'sonner';
import ParticleBackground from '@/components/ParticleBackground';
import ErrorBoundary from '@/components/ErrorBoundary';
import ThemeToggle from '@/components/ThemeToggle';
import ModeSwitcher from '@/components/ModeSwitcher';
import { BrowseView, ResearchView, ScrapeView } from '@/components/ModeViews';
import VenturesPanel from '@/components/VenturesPanel';
import MusicRightsPanel from '@/components/MusicRightsPanel';
import SecurityDashboard from '@/components/SecurityDashboard';
import { BuildWorkspace } from '@/features/build/components/BuildWorkspace';
import { getSettings, getEnabledIntegrations, saveSettings, type AppSettings, type AppMode } from '@/lib/settings';
import { type WorkspaceMode } from '@/lib/workspace';
import { usePipeline } from '@/features/build/hooks/usePipeline';
import { WorkspaceErrorFallback } from '@/components/WorkspaceErrorFallback';

const SettingsDrawer = dynamic(() => import('@/components/SettingsDrawer'), { ssr: false });

function AppContent() {
  const [mounted, setMounted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(getSettings);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('ventures');
  const [securityStatus, setSecurityStatus] = useState<'clear' | 'warning' | 'threat'>('clear');

  const pipeline = usePipeline();

  useEffect(() => {
    const handler = () => setAppSettings(getSettings());
    window.addEventListener('ab:settings-changed', handler);
    return () => window.removeEventListener('ab:settings-changed', handler);
  }, []);

  useEffect(() => { setMounted(true); }, []);

  const isEasyMode = appSettings.mode === 'easy';

  useEffect(() => {
    if (isEasyMode && pipeline.state.view === 'analysis' && pipeline.state.analysis) {
      pipeline.handleStartBuild();
    }
  }, [isEasyMode, pipeline.state.view, pipeline.state.analysis, pipeline.handleStartBuild]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {appSettings.ui.particles && <ParticleBackground />}

      <header className="relative z-40 flex items-center gap-3 px-4 sm:px-6 h-14 border-b border-border/30 glass-strong flex-shrink-0">
        <div className="flex items-center gap-2">
          <Hexagon className="w-5 h-5 text-primary" />
          <span className="text-sm font-bold tracking-tight">
            Ultimate<span className="text-primary">Agent</span>
          </span>
        </div>

        <div className="w-px h-6 bg-border/30 mx-1 hidden sm:block" />

        <form
          className="hidden md:flex relative items-center flex-1 max-w-xs"
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem('bhcmd') as HTMLInputElement;
            const val = input.value.trim();
            if (!val) return;
            import('@/lib/big-homie-client').then(({ bigHomie }) => {
              if (bigHomie.status !== 'connected') bigHomie.connect();
              bigHomie.chat(val);
              toast.success('Sent to Big Homie', { description: val.slice(0, 60) });
              input.value = '';
            });
          }}
        >
          <Bot className="absolute left-3 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            name="bhcmd"
            type="text"
            placeholder="Ask Big Homie..."
            className="w-full bg-background/40 border border-border/40 rounded-full py-1.5 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
        </form>

        {mounted && !(isEasyMode && (pipeline.state.view === 'pipeline' || pipeline.state.view === 'complete')) && (
          <button
            onClick={pipeline.handleNewProject}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/30 bg-background/30 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-200"
          >
            <Plus className="w-2.5 h-2.5" />
            <span className="hidden sm:inline truncate max-w-[160px]">
              {pipeline.state.project?.name || 'New Project'}
            </span>
          </button>
        )}

        <ModeSwitcher mode={workspaceMode} onChange={setWorkspaceMode} buildRunning={pipeline.state.pipelineRunning} />

        <div className="flex-1" />

        {pipeline.state.confidence > 0 && (
          <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${
            pipeline.state.confidence >= 90
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : pipeline.state.confidence >= 60
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${pipeline.state.confidence >= 90 ? 'bg-emerald-400' : pipeline.state.confidence >= 60 ? 'bg-amber-400' : 'bg-red-400'} animate-pulse`} />
            {pipeline.state.confidence}% Complete
          </div>
        )}

        {mounted && !isEasyMode && pipeline.state.view === 'pipeline' && pipeline.state.currentPhase >= 0 && (
          <span className="hidden md:inline text-[10px] text-muted-foreground font-mono">
            Phase {pipeline.state.currentPhase + 1}/12
          </span>
        )}

        <div className="w-px h-6 bg-border/30 mx-1 hidden sm:block" />

        <button
          onClick={() => {
            const newMode: AppMode = appSettings.mode === 'easy' ? 'dev' : 'easy';
            const newSettings = { ...appSettings, mode: newMode };
            setAppSettings(newSettings);
            saveSettings(newSettings);
          }}
          className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all hover:scale-105 ${
            mounted && appSettings.mode === 'dev'
              ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}
          title="Click to switch between Easy and Dev mode"
        >
          {mounted ? appSettings.mode : 'easy'}
        </button>

        <button
          onClick={() => setWorkspaceMode('security')}
          title="Security Status"
          className="p-2 rounded-xl hover:bg-white/10 transition-all"
        >
          <Shield className={`w-3.5 h-3.5 ${
            securityStatus === 'clear' ? 'text-green-400' :
            securityStatus === 'warning' ? 'text-yellow-400' :
            'text-red-400'
          }`} />
        </button>

        {mounted && !isEasyMode && (
          <button
            onClick={() => setShowSettings(true)}
            title="Settings & integrations"
            className="relative p-2 rounded-xl hover:bg-white/10 text-foreground/60 hover:text-foreground transition-all"
          >
            <Settings2 className="w-3.5 h-3.5" />
            {getEnabledIntegrations().length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
                {getEnabledIntegrations().length}
              </span>
            )}
          </button>
        )}

        <ThemeToggle />

        <button
          onClick={pipeline.handleNewProject}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, oklch(0.55 0.22 280), oklch(0.5 0.18 260))' }}
        >
          <Plus className="w-2.5 h-2.5" />
          <span className="hidden sm:inline">New</span>
        </button>
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto">
        {workspaceMode === 'build' && (
          <ErrorBoundary fallback={<WorkspaceErrorFallback title="Build workspace error" onReset={() => pipeline.handleNewProject()} />}>
            <BuildWorkspace pipeline={pipeline} mounted={mounted} isEasyMode={isEasyMode} />
          </ErrorBoundary>
        )}
        {workspaceMode === 'browse' && (
          <ErrorBoundary fallback={<WorkspaceErrorFallback title="Browse workspace error" />}>
            <BrowseView />
          </ErrorBoundary>
        )}
        {workspaceMode === 'research' && (
          <ErrorBoundary fallback={<WorkspaceErrorFallback title="Research workspace error" />}>
            <ResearchView />
          </ErrorBoundary>
        )}
        {workspaceMode === 'scrape' && (
          <ErrorBoundary fallback={<WorkspaceErrorFallback title="Scrape workspace error" />}>
            <ScrapeView />
          </ErrorBoundary>
        )}
        {workspaceMode === 'ventures' && (
          <ErrorBoundary fallback={<WorkspaceErrorFallback title="Ventures workspace error" />}>
            <VenturesPanel />
          </ErrorBoundary>
        )}
        {workspaceMode === 'security' && (
          <ErrorBoundary fallback={<WorkspaceErrorFallback title="Security workspace error" />}>
            <SecurityDashboard />
          </ErrorBoundary>
        )}
        {workspaceMode === 'music-rights' && (
          <ErrorBoundary fallback={<WorkspaceErrorFallback title="Music rights workspace error" />}>
            <MusicRightsPanel />
          </ErrorBoundary>
        )}
      </main>

      <SettingsDrawer open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

export default function Home() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
