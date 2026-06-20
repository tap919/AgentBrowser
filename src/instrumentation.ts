export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { agentScheduler } = await import('@/lib/agent-scheduler');
    agentScheduler.initialize().catch((err: Error) => {
      console.error('[instrumentation] Failed to initialize agent scheduler:', err.message);
    });
  }
}
