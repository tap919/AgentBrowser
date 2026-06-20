import { NextRequest, NextResponse } from 'next/server';
import { startPipeline, getLatestPipelineStatus } from '@/lib/mutly-client';

export async function POST(req: NextRequest) {
  const { projectDir } = await req.json().catch(() => ({}));
  const result = await startPipeline(projectDir);
  if ('error' in result) {
    return NextResponse.json(result, { status: 503 });
  }
  return NextResponse.json(result);
}

export async function GET() {
  const result = await getLatestPipelineStatus();
  if ('error' in result) {
    return NextResponse.json(result, { status: 503 });
  }
  return NextResponse.json(result);
}
