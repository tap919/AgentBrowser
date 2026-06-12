import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'os';

const HOME_DIR = os.homedir();

export interface LocalProject {
  name: string;
  fullPath: string;
  hasGit: boolean;
  hasPackageJson: boolean;
  hasReadme: boolean;
  updatedAt: string;
  sizeBytes: number;
  gitRemote?: string;
  description?: string;
}

export interface GitHubRepo {
  name: string;
  fullName: string;
  url: string;
  description: string | null;
  updatedAt: string;
  language: string | null;
  stars: number;
  owner: string;
}

export interface DesktopTool {
  name: string;
  fullPath: string;
  type: 'node' | 'python' | 'binary' | 'unknown';
  hasGit: boolean;
  description?: string;
}

const DESKTOP_SCAN_DIRS = [
  path.join(HOME_DIR, 'Desktop'),
  path.join(HOME_DIR, 'Documents'),
];

const KNOWN_TOOLS = new Set([
  'reporank', 'mutly', 'vibeserve', 'aetherdesk', 'subteam', 'jobclaw',
]);

export function scanLocalProjects(): LocalProject[] {
  const projects: LocalProject[] = [];
  const seen = new Set<string>();

  for (const scanDir of DESKTOP_SCAN_DIRS) {
    if (!fs.existsSync(scanDir)) continue;
    const entries = fs.readdirSync(scanDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const fullPath = path.join(scanDir, entry.name);
      if (seen.has(fullPath)) continue;
      seen.add(fullPath);

      const hasGit = fs.existsSync(path.join(fullPath, '.git'));
      const hasPackageJson = fs.existsSync(path.join(fullPath, 'package.json'));
      const hasReadme = fs.existsSync(path.join(fullPath, 'README.md'));

      if (!hasGit && !hasPackageJson) continue;

      let gitRemote: string | undefined;
      if (hasGit) {
        try {
          const config = fs.readFileSync(path.join(fullPath, '.git', 'config'), 'utf-8');
          const urlMatch = config.match(/url\s*=\s*(.+)/);
          if (urlMatch) gitRemote = urlMatch[1].trim();
        } catch {}
      }

      let pkgDescription: string | undefined;
      if (hasPackageJson) {
        try {
          const pkg = JSON.parse(fs.readFileSync(path.join(fullPath, 'package.json'), 'utf-8'));
          pkgDescription = pkg.description;
        } catch {}
      }

      const stats = fs.statSync(fullPath);

      projects.push({
        name: entry.name,
        fullPath,
        hasGit,
        hasPackageJson,
        hasReadme,
        updatedAt: stats.mtime.toISOString(),
        sizeBytes: stats.size,
        gitRemote,
        description: pkgDescription,
      });
    }
  }

  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function scanDesktopTools(): DesktopTool[] {
  const tools: DesktopTool[] = [];
  const desktop = DESKTOP_SCAN_DIRS[0];
  if (!fs.existsSync(desktop)) return tools;

  const entries = fs.readdirSync(desktop, { withFileTypes: true });
  for (const entry of entries) {
    const name = entry.name.replace(/-main$/, '').toLowerCase();
    if (!KNOWN_TOOLS.has(name)) continue;

    const fullPath = path.join(desktop, entry.name);
    const hasGit = fs.existsSync(path.join(fullPath, '.git'));
    const hasPkg = fs.existsSync(path.join(fullPath, 'package.json'));
    const hasPy = fs.existsSync(path.join(fullPath, 'requirements.txt')) ||
                  fs.existsSync(path.join(fullPath, 'setup.py'));

    tools.push({
      name: entry.name,
      fullPath,
      type: hasPkg ? 'node' : hasPy ? 'python' : 'unknown',
      hasGit,
      description: entry.name,
    });
  }

  return tools;
}

export async function syncGitHubRepos(owner: string, token?: string): Promise<GitHubRepo[]> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`https://api.github.com/users/${owner}/repos?per_page=50&sort=updated`, { headers });
    if (!res.ok) return [];

    const repos = await res.json() as Array<{
      name: string; full_name: string; html_url: string;
      description: string | null; updated_at: string;
      language: string | null; stargazers_count: number;
    }>;

    return repos.map(r => ({
      name: r.name,
      fullName: r.full_name,
      url: r.html_url,
      description: r.description,
      updatedAt: r.updated_at,
      language: r.language,
      stars: r.stargazers_count,
      owner,
    }));
  } catch {
    return [];
  }
}
