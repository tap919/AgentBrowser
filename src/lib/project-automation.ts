import { execSync } from 'child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'os';

const HOME_DIR = os.homedir();
const CODING_TRIO = path.join(HOME_DIR, 'Desktop', 'Coding Trio');
const MUTLY_DIR = path.join(CODING_TRIO, 'Mutly-Daemon-Agent');

export interface ProjectAnalysis {
  projectName: string;
  projectPath: string;
  analyzedAt: string;
  mutlyIndex: {
    symbols: number;
    files: number;
    embeddings: number;
    tsFiles: number;
    pyFiles: number;
  };
  reporank: {
    score: number;
    quality: 'good' | 'needs-work' | 'poor';
    issues: string[];
    details: {
      hasReadme: boolean;
      hasGitignore: boolean;
      hasEnvExample: boolean;
      hasTestDir: boolean;
      hasCi: boolean;
      hasLicense: boolean;
      depsCount: number;
      devDepsCount: number;
      scriptsCount: number;
      totalFiles: number;
      codeFiles: number;
      linesOfCode: number;
      hasBuildScript: boolean;
      hasTestScript: boolean;
      hasLintScript: boolean;
      hasStartScript: boolean;
      hasDevScript: boolean;
    };
  };
  tasks: ProjectTask[];
  status: 'idle' | 'analyzing' | 'working' | 'completed' | 'stuck';
}

export interface ProjectTask {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed';
  createdAt: string;
  dependsOn: string[];
}

const PROJECTS_TO_WATCH: Array<{ name: string; path: string }> = [
  { name: 'Billion Business', path: path.join(HOME_DIR, 'Desktop', 'Billion Business') },
  { name: 'BlockLabor-main', path: path.join(HOME_DIR, 'Desktop', 'BlockLabor-main') },
  { name: 'hermes-agent', path: path.join(HOME_DIR, 'Desktop', 'hermes-agent') },
  { name: 'jobclaw', path: path.join(HOME_DIR, 'Desktop', 'jobclaw') },
  { name: 'UL2-main', path: path.join(HOME_DIR, 'Desktop', 'UL2-main') },
  { name: 'Aetherdesk-Call-Center-main', path: path.join(HOME_DIR, 'Desktop', 'Aetherdesk-Call-Center-main') },
  { name: 'NCSOUND-PUB-main', path: path.join(HOME_DIR, 'Desktop', 'NCSOUND-PUB-main') },
  { name: 'jewelry site', path: path.join(HOME_DIR, 'Desktop', 'jewelry site') },
  { name: 'Vibe-Reality-main', path: path.join(HOME_DIR, 'Desktop', 'Vibe-Reality-main') },
  { name: 'GemmaDesktop-main', path: path.join(HOME_DIR, 'Desktop', 'GemmaDesktop-main') },
  { name: 'tap919-middleman-main', path: path.join(HOME_DIR, 'Desktop', 'tap919-middleman-main') },
  { name: 'Sub-Team-main', path: path.join(HOME_DIR, 'Desktop', 'Sub-Team-main') },
];

function findFiles(dir: string, exts: string[]): { path: string; lines: number }[] {
  const results: { path: string; lines: number }[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== 'dist' && entry.name !== 'build' && entry.name !== 'coverage' && entry.name !== '__pycache__') {
          results.push(...findFiles(full, exts));
        }
      } else if (exts.some(e => entry.name.endsWith(e))) {
        try {
          const content = fs.readFileSync(full, 'utf-8');
          results.push({ path: full, lines: content.split('\n').length });
        } catch { results.push({ path: full, lines: 0 }); }
      }
    }
  } catch {}
  return results;
}

function analyzeProjectOnDisk(projectPath: string): ProjectAnalysis['reporank']['details'] {
  const details: ProjectAnalysis['reporank']['details'] = {
    hasReadme: fs.existsSync(path.join(projectPath, 'README.md')),
    hasGitignore: fs.existsSync(path.join(projectPath, '.gitignore')),
    hasEnvExample: fs.existsSync(path.join(projectPath, '.env.example')),
    hasTestDir: fs.existsSync(path.join(projectPath, 'tests')) || fs.existsSync(path.join(projectPath, 'test')),
    hasCi: fs.existsSync(path.join(projectPath, '.github')) || fs.existsSync(path.join(projectPath, '.circleci')),
    hasLicense: fs.existsSync(path.join(projectPath, 'LICENSE')) || fs.existsSync(path.join(projectPath, 'LICENSE.md')),
    depsCount: 0, devDepsCount: 0, scriptsCount: 0,
    totalFiles: 0, codeFiles: 0, linesOfCode: 0,
    hasBuildScript: false, hasTestScript: false, hasLintScript: false,
    hasStartScript: false, hasDevScript: false,
  };

  const pkgPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      details.depsCount = pkg.dependencies ? Object.keys(pkg.dependencies).length : 0;
      details.devDepsCount = pkg.devDependencies ? Object.keys(pkg.devDependencies).length : 0;
      const scripts = pkg.scripts || {};
      details.scriptsCount = Object.keys(scripts).length;
      details.hasBuildScript = !!scripts.build;
      details.hasTestScript = !!scripts.test;
      details.hasLintScript = !!scripts.lint;
      details.hasStartScript = !!scripts.start;
      details.hasDevScript = !!scripts.dev;
    } catch {}
  }

  const codeFiles = findFiles(projectPath, ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.css', '.scss']);
  details.codeFiles = codeFiles.length;
  details.linesOfCode = codeFiles.reduce((s, f) => s + f.lines, 0);

  const allFiles = findFiles(projectPath, ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.css', '.scss', '.json', '.md', '.yaml', '.yml', '.html']);
  details.totalFiles = allFiles.length;

  return details;
}

function scoreProject(details: ProjectAnalysis['reporank']['details']): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 60;

  if (details.hasReadme) score += 10; else issues.push('Missing README.md');
  if (details.hasGitignore) score += 5; else issues.push('Missing .gitignore');
  if (details.hasEnvExample) score += 5; else issues.push('Missing .env.example');
  if (details.hasTestDir) score += 8; else issues.push('No test directory');
  if (details.hasCi) score += 8; else issues.push('No CI configuration');
  if (details.hasLicense) score += 4;
  if (details.hasBuildScript) score += 5; else issues.push('No build script');
  if (details.hasTestScript) score += 5; else issues.push('No test script');
  if (details.hasLintScript) score += 3; else issues.push('No lint script');
  if (details.hasDevScript) score += 2;
  if (details.depsCount > 0) score += 2;
  if (details.codeFiles > 0) score += Math.min(8, details.codeFiles);
  if (details.linesOfCode > 0) score += Math.min(5, Math.floor(details.linesOfCode / 100));

  score = Math.min(100, Math.max(0, score));

  return { score, issues };
}

export function analyzeProjectSync(projectName: string, projectPath: string): ProjectAnalysis {
  const details = analyzeProjectOnDisk(projectPath);
  const { score, issues } = scoreProject(details);

  const quality: ProjectAnalysis['reporank']['quality'] =
    score >= 80 ? 'good' : score >= 50 ? 'needs-work' : 'poor';

  const codeFiles = findFiles(projectPath, ['.ts', '.tsx', '.js', '.jsx', '.py']);
  const tsFiles = codeFiles.filter(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx'));
  const pyFiles = codeFiles.filter(f => f.path.endsWith('.py'));

  const tasks = getDefaultTasks(projectName, projectPath, details);

  return {
    projectName, projectPath,
    analyzedAt: new Date().toISOString(),
    mutlyIndex: {
      symbols: Math.round(tsFiles.length * 2.7 + pyFiles.length * 1.3),
      files: codeFiles.length,
      embeddings: codeFiles.length,
      tsFiles: tsFiles.length,
      pyFiles: pyFiles.length,
    },
    reporank: { score, quality, issues, details },
    tasks,
    status: tasks.length > 0 ? 'analyzing' : 'idle',
  };
}

export function getDefaultTasks(
  projectName: string,
  projectPath: string,
  details?: ProjectAnalysis['reporank']['details']
): ProjectTask[] {
  const d = details || analyzeProjectOnDisk(projectPath);
  const tasks: ProjectTask[] = [];

  if (!d.hasReadme) {
    tasks.push({
      id: `${projectName}-readme`, priority: 'high', status: 'pending',
      title: 'Create README.md',
      description: 'Document project purpose, setup, and usage',
      createdAt: new Date().toISOString(), dependsOn: [],
    });
  }
  if (!d.hasGitignore) {
    tasks.push({
      id: `${projectName}-gitignore`, priority: 'high', status: 'pending',
      title: 'Add .gitignore',
      description: 'Create .gitignore for node_modules, .env, build artifacts',
      createdAt: new Date().toISOString(), dependsOn: [],
    });
  }
  if (!d.hasEnvExample) {
    tasks.push({
      id: `${projectName}-env`, priority: 'medium', status: 'pending',
      title: 'Create .env.example',
      description: 'Document required environment variables',
      createdAt: new Date().toISOString(), dependsOn: [],
    });
  }
  if (!d.hasTestScript) {
    tasks.push({
      id: `${projectName}-test`, priority: 'high', status: 'pending',
      title: 'Add test infrastructure',
      description: 'Set up testing framework (vitest/jest)',
      createdAt: new Date().toISOString(), dependsOn: [],
    });
  }
  if (!d.hasCi) {
    tasks.push({
      id: `${projectName}-ci`, priority: 'medium', status: 'pending',
      title: 'Add CI configuration',
      description: 'Set up GitHub Actions for automated testing',
      createdAt: new Date().toISOString(), dependsOn: [`${projectName}-test`],
    });
  }
  if (d.depsCount > 0 && !d.hasBuildScript) {
    tasks.push({
      id: `${projectName}-build`, priority: 'medium', status: 'pending',
      title: 'Add build script',
      description: 'Create a build script in package.json',
      createdAt: new Date().toISOString(), dependsOn: [],
    });
  }

  return tasks;
}

export async function analyzeAllProjects(): Promise<ProjectAnalysis[]> {
  return PROJECTS_TO_WATCH
    .filter(p => fs.existsSync(p.path))
    .map(p => analyzeProjectSync(p.name, p.path));
}

export function getWatchedProjects() {
  return PROJECTS_TO_WATCH.map(p => ({
    ...p,
    exists: fs.existsSync(p.path),
    hasGit: fs.existsSync(path.join(p.path, '.git')),
    hasPackageJson: fs.existsSync(path.join(p.path, 'package.json')),
  }));
}

export { PROJECTS_TO_WATCH };
