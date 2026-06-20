import { NextResponse } from 'next/server';
import { listVibeServeTools } from '@/lib/vibeserve-client';

export async function GET() {
  const result = await listVibeServeTools();
  if ('error' in result) {
    return NextResponse.json(result, { status: 503 });
  }
  return NextResponse.json(result);
}
