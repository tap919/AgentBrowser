import { NextResponse } from 'next/server';
import { checkMutlyHealth } from '@/lib/mutly-client';

export async function GET() {
  const healthy = await checkMutlyHealth();
  return NextResponse.json({
    status: healthy ? 'ok' : 'unreachable',
    healthy,
  });
}
