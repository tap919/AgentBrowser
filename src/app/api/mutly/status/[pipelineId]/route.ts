import { NextResponse } from 'next/server';
import { getPipelineStatus } from '@/lib/mutly-client';

export async function GET(
  _req: Request,
  context: { params: Promise<{ pipelineId: string }> }
) {
  const { pipelineId } = await context.params;
  const result = await getPipelineStatus(pipelineId);
  if ('error' in result) {
    const status = result.error === 'Pipeline not found' ? 404 : 503;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
