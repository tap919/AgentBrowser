'use client';

import { Brain, Plus, Download } from 'lucide-react';
import ProjectForm from '@/components/ProjectForm';
import AIAnalysisCard from '@/components/AIAnalysisCard';
import BuildView from '@/components/BuildView';
import Deliverables from '@/components/Deliverables';
import ActivityLog from '@/components/ActivityLog';
import ToolEcosystem from '@/components/ToolEcosystem';
import TrendingReposPanel from '@/components/TrendingReposPanel';
import UpgradeSweepPanel from '@/components/UpgradeSweepPanel';
import GitHubPanel from '@/components/GitHubPanel';
import EasyModeWizard from '@/components/EasyModeWizard';
import EasyBuildProgress from '@/components/EasyBuildProgress';
import type { ReturnTypeOfUsePipeline } from '@/features/build/hooks/usePipeline';

interface BuildWorkspaceProps {
  pipeline: ReturnTypeOfUsePipeline;
  mounted: boolean;
  isEasyMode: boolean;
}

export function BuildWorkspace({ pipeline, mounted, isEasyMode }: BuildWorkspaceProps) {
  if (mounted && isEasyMode) {
    return (
      <>
        {pipeline.state.view === 'form' && (
          <EasyModeWizard onSubmit={pipeline.handleFormSubmit} />
        )}
        {(pipeline.state.view === 'analyzing' || pipeline.state.view === 'analysis') && (
          <div className="min-h-full flex items-center justify-center p-4 sm:p-8">
            <div className="text-center animate-fade-in-up space-y-4">
              <div className="relative inline-block">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, oklch(0.55 0.22 280), oklch(0.6 0.2 190))' }}>
                  <Brain className="w-6 h-6 text-white animate-pulse" />
                </div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-primary/20 animate-ping opacity-30" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Getting everything ready...</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                We&apos;re planning the best way to build what you described. This only takes a moment.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 200}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        {(pipeline.state.view === 'pipeline' || pipeline.state.view === 'complete') && (
          <EasyBuildProgress
            phases={pipeline.state.phases}
            currentPhase={pipeline.state.currentPhase}
            confidence={pipeline.state.confidence}
            isPaused={pipeline.state.isPaused}
            pipelineRunning={pipeline.state.pipelineRunning}
            lastSaved={pipeline.lastSaved}
            projectName={pipeline.state.project?.name || 'Your Project'}
            onTest={() => {}}
            onDownload={() => {}}
          />
        )}
      </>
    );
  }

  if (!mounted) return null;

  return (
    <>
      {pipeline.state.view === 'form' && (
        <div className="min-h-full flex flex-col items-center justify-start p-4 sm:p-8 gap-6 overflow-y-auto">
          <ProjectForm onSubmit={pipeline.handleFormSubmit} isAnalyzing={false} />
          <div className="w-full max-w-2xl space-y-6">
            <UpgradeSweepPanel />
            <ToolEcosystem />
            <TrendingReposPanel />
            <GitHubPanel />
          </div>
        </div>
      )}
      {pipeline.state.view === 'analyzing' && (
        <div className="min-h-full flex items-center justify-center p-4 sm:p-8">
          <div className="text-center animate-fade-in-up">
            <div className="relative inline-block mb-6">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/20">
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
                <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 200}ms` }} />
              ))}
            </div>
          </div>
        </div>
      )}
      {pipeline.state.view === 'analysis' && pipeline.state.analysis && (
        <div className="min-h-full flex items-center justify-center p-4 sm:p-8">
          <AIAnalysisCard
            analysis={pipeline.state.analysis}
            onStart={pipeline.handleStartBuild}
            isStarting={false}
          />
        </div>
      )}
      {pipeline.state.view === 'pipeline' && (
        <div className="h-full">
          <BuildView
            project={pipeline.state.project}
            phases={pipeline.state.phases}
            currentPhase={pipeline.state.currentPhase}
            currentSubStep={pipeline.state.currentSubStep}
            isPaused={pipeline.state.isPaused}
            pipelineRunning={pipeline.state.pipelineRunning}
            confidence={pipeline.state.confidence}
            speed={pipeline.state.speed}
            metrics={pipeline.state.metrics}
            findings={pipeline.state.findings}
            log={pipeline.state.log}
            lastSaved={pipeline.lastSaved}
            onPauseResume={pipeline.handlePauseResume}
            onSpeedChange={pipeline.handleSpeedChange}
            onRunAudit={pipeline.handleRunAudit}
            onExport={pipeline.handleExportReport}
          />
        </div>
      )}
      {pipeline.state.view === 'complete' && pipeline.state.project && (
        <div className="max-w-5xl mx-auto p-4 sm:p-6 animate-fade-in-up">
          <Deliverables
            projectName={pipeline.state.project.name}
            techStack={pipeline.state.techStack}
            metrics={pipeline.state.metrics}
          />
          <div className="mt-6">
            <ActivityLog entries={pipeline.state.log} />
          </div>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={pipeline.handleExportReport}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm border border-border/30 bg-background/30 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
            <button
              onClick={pipeline.handleNewProject}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-300 hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, oklch(0.55 0.22 280), oklch(0.6 0.2 190), oklch(0.55 0.18 160))' }}
            >
              <Plus className="w-4 h-4" />
              Start New Project
            </button>
          </div>
        </div>
      )}
    </>
  );
}
