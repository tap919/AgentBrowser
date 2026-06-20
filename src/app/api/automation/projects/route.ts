import { NextResponse } from 'next/server';
import { analyzeAllProjects, getWatchedProjects } from '@/lib/project-automation';
import { scanLocalProjects, scanDesktopTools } from '@/lib/project-discovery';

export async function GET() {
  try {
    const [watched, analyses, localProjects, tools] = await Promise.all([
      Promise.resolve(getWatchedProjects()),
      analyzeAllProjects(),
      Promise.resolve(scanLocalProjects()),
      Promise.resolve(scanDesktopTools()),
    ]);

    return NextResponse.json({
      watchedProjects: watched,
      analyses,
      localProjects,
      tools,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Automation scan failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, projectName, projectPath } = body;

    if (action === 'analyze-one' && projectName && projectPath) {
      const { analyzeProjectSync } = await import('@/lib/project-automation');
      const analysis = analyzeProjectSync(projectName, projectPath);
      return NextResponse.json({ analysis });
    }

    if (action === 'scan-all') {
      const analyses = await analyzeAllProjects();
      return NextResponse.json({ analyses, count: analyses.length });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Request failed' },
      { status: 500 }
    );
  }
}
