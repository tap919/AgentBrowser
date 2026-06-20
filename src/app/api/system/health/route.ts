import { NextResponse } from 'next/server';
import { checkClawProtectHealth } from '@/lib/claw-protect-client';
import { checkMutlyHealth } from '@/lib/mutly-client';
import { checkVibeServeHealth } from '@/lib/vibeserve-client';
import { checkReporankHealth } from '@/lib/reporank-client';

export async function GET() {
  const [claw, mutly, vibeserve, reporank] = await Promise.all([
    checkClawProtectHealth().catch(() => false),
    checkMutlyHealth().catch(() => false),
    checkVibeServeHealth().catch(() => false),
    checkReporankHealth().catch(() => false),
  ]);

  const subsystems = {
    'claw-protect': { reachable: claw, fallback: 'block' },
    mutly: { reachable: mutly, fallback: 'degraded' },
    'vibeserve': { reachable: vibeserve, fallback: 'mutly-proxy' },
    reporank: { reachable: reporank, fallback: 'noop' },
    'big-homie': { reachable: false, fallback: 'local-preset' },
  };

  // Big Homie runs its own WS health check — try via status route
  try {
    const bh = await fetch(`${process.env.NEXT_PUBLIC_BIG_HOMIE_URL || 'http://localhost:8888'}/tools/status`, { signal: AbortSignal.timeout(3000) });
    subsystems['big-homie'].reachable = bh.ok;
  } catch {
    subsystems['big-homie'].reachable = false;
  }

  const allReachable = Object.values(subsystems).every(s => s.reachable);
  const allDown = Object.values(subsystems).every(s => !s.reachable);
  return NextResponse.json({
    status: allReachable ? 'healthy' : allDown ? 'down' : 'degraded',
    usingFallback: !allReachable,
    subsystems,
    timestamp: new Date().toISOString(),
  });
}
