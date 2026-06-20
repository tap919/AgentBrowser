import { NextRequest, NextResponse } from 'next/server';
import { callVibeServeTool } from '@/lib/vibeserve-client';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ toolName: string }> }
) {
  const { toolName } = await context.params;
  const args = await req.json().catch(() => ({}));
  const result = await callVibeServeTool(toolName, args);
  if ('error' in result) {
    return NextResponse.json(result, { status: 503 });
  }
  return NextResponse.json(result);
}
