import { NextResponse } from 'next/server';
import { bigHomie } from '@/lib/big-homie-client';

export async function GET() {
  const isHealthy = await bigHomie.checkHealth();
  return NextResponse.json({
    status: bigHomie.status,
    connected: bigHomie.status === 'connected',
    healthy: isHealthy,
  });
}
