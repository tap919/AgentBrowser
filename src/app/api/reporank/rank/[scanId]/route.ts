import { NextResponse } from 'next/server';
import { getScanStatus } from '@/lib/reporank-client';

export async function GET(
  _req: Request,
  context: { params: Promise<{ scanId: string }> }
) {
  const { scanId } = await context.params;
  const result = await getScanStatus(scanId);
  if ('error' in result) {
    return NextResponse.json(result, { status: 404 });
  }
  return NextResponse.json(result);
}
