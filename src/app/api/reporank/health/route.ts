import { NextResponse } from 'next/server';
import { checkReporankHealth } from '@/lib/reporank-client';

export async function GET() {
  const healthy = await checkReporankHealth();
  return NextResponse.json({ status: healthy ? 'ok' : 'unreachable', healthy });
}
