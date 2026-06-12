'use client';

import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface WorkspaceErrorFallbackProps {
  title?: string;
  onReset?: () => void;
  onNavigateHome?: () => void;
}

export function WorkspaceErrorFallback({
  title = 'Workspace error',
  onReset,
  onNavigateHome,
}: WorkspaceErrorFallbackProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-5 animate-fade-in-up">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground">
            This workspace encountered an unexpected error. You can retry or switch to a different workspace.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          {onReset && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium border border-border/30 bg-background/30 hover:bg-background/50 text-muted-foreground hover:text-foreground transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          )}
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium border border-border/30 bg-background/30 hover:bg-background/50 text-muted-foreground hover:text-foreground transition-all"
            >
              <Home className="w-3.5 h-3.5" />
              Home
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
