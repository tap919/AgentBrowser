import { NextResponse } from 'next/server';
import { checkVibeServeHealth } from '@/lib/vibeserve-client';

export async function GET() {
  const healthy = await checkVibeServeHealth();
  return NextResponse.json({ status: healthy ? 'ok' : 'unreachable', healthy });
}
