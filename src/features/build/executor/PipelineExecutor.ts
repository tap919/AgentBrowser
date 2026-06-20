import type { PhaseInput, PhaseResult, ProgressCallback } from './PhaseRunner';
import { Phase1Research } from './phases/Phase1Research';
import { Phase2Planning } from './phases/Phase2Planning';
import { Phase3Design } from './phases/Phase3Design';
import { Phase4Foundation } from './phases/Phase4Foundation';
import { Phase5Browser } from './phases/Phase5Browser';
import { Phase6CoreFeatures } from './phases/Phase6CoreFeatures';
import { Phase7Audit } from './phases/Phase7Audit';
import { Phase8AILayer } from './phases/Phase8AILayer';
import { Phase9Features } from './phases/Phase9Features';
import { Phase10Perf } from './phases/Phase10Perf';
import { Phase11FullAudit } from './phases/Phase11FullAudit';
import { Phase12Deploy } from './phases/Phase12Deploy';

export const PHASES = [
  { id: 1, name: 'AI Research & Planning', runner: Phase1Research },
  { id: 2, name: 'Understand What You Need', runner: Phase2Planning },
  { id: 3, name: 'Design the System', runner: Phase3Design },
  { id: 4, name: 'Set Up the Foundation', runner: Phase4Foundation },
  { id: 5, name: 'Browser Automation Engine', runner: Phase5Browser },
  { id: 6, name: 'Build Core Features', runner: Phase6CoreFeatures },
  { id: 7, name: 'Quality Gate: Core Audit', runner: Phase7Audit },
  { id: 8, name: 'AI-Powered Automation Layer', runner: Phase8AILayer },
  { id: 9, name: 'Build Remaining Features', runner: Phase9Features },
  { id: 10, name: 'Performance Optimization', runner: Phase10Perf },
  { id: 11, name: 'Quality Gate: Full Audit', runner: Phase11FullAudit },
  { id: 12, name: 'Deploy and Deliver', runner: Phase12Deploy },
];

export type PhaseCallback = (phase: number, sub: number, msg: string) => void;

export class PipelineExecutor {
  private workspaceDir: string;
  private abortController: AbortController | null = null;
  private _activePhase: number | null = null;
  private isExecuting = false;

  constructor(workspaceDir: string) {
    this.workspaceDir = workspaceDir;
  }

  get activePhase(): number | null {
    return this._activePhase;
  }

  async executePhase(phaseId: number, input: PhaseInput, onProgress?: ProgressCallback): Promise<PhaseResult> {
    const def = PHASES.find(p => p.id === phaseId);
    if (!def) throw new Error(`Unknown phase: ${phaseId}`);
    const runner = new def.runner(this.workspaceDir);
    this._activePhase = phaseId;
    return runner.execute(phaseId, input, this.abortController?.signal, onProgress);
  }

  async executeAll(input: PhaseInput, onProgress?: PhaseCallback): Promise<PhaseResult[]> {
    if (this.isExecuting) throw new Error('Executor is already running');
    this.isExecuting = true;
    this.abortController = new AbortController();
    const results: PhaseResult[] = [];

    try {
      for (const def of PHASES) {
        if (this.abortController.signal.aborted) break;
        onProgress?.(def.id, 0, `Starting ${def.name}...`);

        const phaseProgress: ProgressCallback = (subStep, totalSteps, message) => {
          const pct = totalSteps > 0 ? Math.round((subStep / totalSteps) * 100) : 0;
          onProgress?.(def.id, pct, message);
        };

        const result = await this.executePhase(def.id, input, phaseProgress);
        results.push(result);
        onProgress?.(def.id, 100, `Completed ${def.name}`);
      }
    } finally {
      this.isExecuting = false;
      this._activePhase = null;
    }

    return results;
  }

  abort(): void {
    this.abortController?.abort();
  }
}
