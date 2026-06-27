import { NextResponse } from 'next/server';
import { checkAllServices, SERVICES } from '@/lib/service-hub';
import { agentEventBus } from '@/lib/agent-event-bus';

interface SystemStatus {
  status: 'healthy' | 'degraded' | 'down';
  version: string;
  uptime: number;
  services: Array<{
    id: string;
    name: string;
    type: string;
    port: number;
    status: 'running' | 'stopped' | 'error' | 'unknown';
    healthEndpoint: string;
    capabilities: string[];
  }>;
  summary: {
    total: number;
    running: number;
    stopped: number;
    error: number;
  };
  recentEvents: Array<{
    id: string;
    type: string;
    source: string;
    timestamp: string;
    result?: string;
  }>;
  timestamp: string;
}

const startTime = Date.now();

export async function GET() {
  const healthResults = await checkAllServices();

  const services = SERVICES.map(svc => {
    const health = healthResults.find(h => h.id === svc.id);
    return {
      id: svc.id,
      name: svc.name,
      type: svc.type,
      port: svc.port,
      status: health?.running ? 'running' as const :
              health?.error ? 'error' as const :
              svc.status === 'stopped' ? 'stopped' as const : 'unknown' as const,
      healthEndpoint: svc.healthEndpoint,
      capabilities: svc.capabilities,
    };
  });

  const running = services.filter(s => s.status === 'running').length;
  const stopped = services.filter(s => s.status === 'stopped').length;
  const errored = services.filter(s => s.status === 'error').length;

  const recentEvents = agentEventBus.getRecent(undefined, 20).map(e => ({
    id: e.id,
    type: e.type,
    source: e.source,
    timestamp: e.timestamp,
    result: (e.payload as Record<string, unknown>)?.result as string | undefined,
  }));

  const status: SystemStatus = {
    status: running === services.length ? 'healthy' :
            running === 0 ? 'down' : 'degraded',
    version: '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    services,
    summary: {
      total: services.length,
      running,
      stopped,
      error: errored,
    },
    recentEvents,
    timestamp: new Date().toISOString(),
  };

  const httpStatus = status.status === 'down' ? 503 : 200;
  return NextResponse.json(status, { status: httpStatus });
}
