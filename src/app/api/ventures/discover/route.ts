import { NextResponse } from 'next/server';
import { scanLocalProjects, scanDesktopTools, syncGitHubRepos } from '@/lib/project-discovery';
import { getBusinessProfile } from '@/lib/business-profile';

export async function GET() {
  try {
    const [projects, tools, business] = await Promise.all([
      Promise.resolve(scanLocalProjects()),
      Promise.resolve(scanDesktopTools()),
      Promise.resolve(getBusinessProfile()),
    ]);

    // Sync GitHub repos for each org
    const repoResults = await Promise.allSettled(
      business.githubOrgs.map(org => syncGitHubRepos(org))
    );
    const repos = repoResults.flatMap(r => r.status === 'fulfilled' ? r.value : []);

    return NextResponse.json({
      projects,
      tools,
      business,
      repos,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Discovery failed' },
      { status: 500 }
    );
  }
}
