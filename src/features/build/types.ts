// Pipeline types — importing from component types to ensure compatibility
import type { PhaseData as ComponentPhase } from '@/components/PipelinePhase';
import type { Metrics as ComponentMetrics } from '@/components/MetricsPanel';
import type { LogEntry as ComponentLogEntry } from '@/components/ActivityLog';
import type { Finding as ComponentFinding } from '@/components/AuditPanel';
import type { AIAnalysis } from '@/components/AIAnalysisCard';
import type { ProjectData } from '@/components/ProjectForm';

export type AppView = 'form' | 'analyzing' | 'analysis' | 'pipeline' | 'complete';

export type PhaseData = ComponentPhase;
export type Metrics = ComponentMetrics;
export type LogEntry = ComponentLogEntry;
export type Finding = ComponentFinding;

export interface AppState {
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
  speed: number;
  isPaused: boolean;
}
