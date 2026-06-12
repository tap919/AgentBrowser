'use client';

import { useCallback, useRef } from 'react';
import { PipelineExecutor, type PhaseCallback } from '@/features/build/executor/PipelineExecutor';
import type { PhaseInput } from '@/features/build/executor/PhaseRunner';

export function usePhaseExecution() {
  const executorRef = useRef<PipelineExecutor | null>(null);

  const startPipeline = useCallback(async (
    input: PhaseInput,
    onProgress?: PhaseCallback,
    workspaceDir?: string,
  ) => {
    const dir = workspaceDir || (
      typeof window !== 'undefined'
        ? window.location.pathname
        : '/tmp/agentbrowser-build'
    );

    const executor = new PipelineExecutor(dir);
    executorRef.current = executor;

    const results = await executor.executeAll(input, onProgress);
    return results;
  }, []);

  const abortPipeline = useCallback(() => {
    executorRef.current?.abort();
    executorRef.current = null;
  }, []);

  return { startPipeline, abortPipeline };
}
