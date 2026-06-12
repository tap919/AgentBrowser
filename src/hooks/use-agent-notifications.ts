'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

export function useAgentNotifications() {
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail) return;

      switch (event.type) {
        case 'agent:started':
          toast.info(`Agent started: ${detail.agentId}`, {
            description: 'Running autonomously in the background',
            duration: 4000,
          });
          break;
        case 'agent:completed':
          toast.success(`Agent completed: ${detail.agentId}`, {
            description: `Duration: ${Math.round(detail.duration / 1000)}s`,
            duration: 5000,
          });
          break;
        case 'agent:failed':
          toast.error(`Agent failed: ${detail.agentId}`, {
            description: detail.error || 'Unknown error',
            duration: 8000,
          });
          break;
      }
    };

    window.addEventListener('agent:started', handler);
    window.addEventListener('agent:completed', handler);
    window.addEventListener('agent:failed', handler);

    return () => {
      window.removeEventListener('agent:started', handler);
      window.removeEventListener('agent:completed', handler);
      window.removeEventListener('agent:failed', handler);
    };
  }, []);
}
