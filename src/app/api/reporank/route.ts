import { NextRequest, NextResponse } from 'next/server';
import { analyzeRepo } from '@/lib/reporank-client';

export async function POST(req: NextRequest) {
  const { repoUrl, branch } = await req.json().catch(() => ({}));
  if (!repoUrl) {
    return NextResponse.json({ error: 'repoUrl is required' }, { status: 400 });
  }
  const result = await analyzeRepo(repoUrl, branch);
  if ('error' in result) {
    return NextResponse.json(result, { status: 503 });
  }
  return NextResponse.json(result);
}
