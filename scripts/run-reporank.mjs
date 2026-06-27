import { analyzeProjectSync, getWatchedProjects } from '../src/lib/project-automation.js';
import * as fs from 'fs';
import * as path from 'path';

console.log('=== RepoRank Real Analysis ===\n');

const projects = getWatchedProjects().filter(p => p.exists);

for (const proj of projects) {
  const result = analyzeProjectSync(proj.name, proj.path);
  const d = result.reporank.details;

  console.log(`╔══ ${proj.name}`);
  console.log(`║   Score: ${result.reporank.score}/100 (${result.reporank.quality})`);
  console.log(`║   Code: ${d.codeFiles} files, ${d.linesOfCode} lines`);
  console.log(`║   Dependencies: ${d.depsCount} prod, ${d.devDepsCount} dev`);
  console.log(`║   Scripts: ${d.scriptsCount} (build=${d.hasBuildScript}, test=${d.hasTestScript}, lint=${d.hasLintScript})`);
  console.log(`║   Docs: README=${d.hasReadme}, .gitignore=${d.hasGitignore}, .env.example=${d.hasEnvExample}`);
  console.log(`║   Quality: CI=${d.hasCi}, Tests=${d.hasTestDir}, License=${d.hasLicense}`);

  if (result.reporank.issues.length > 0) {
    console.log(`║   Issues:`);
    for (const issue of result.reporank.issues) {
      console.log(`║     ⚠ ${issue}`);
    }
  }

  if (result.tasks.length > 0) {
    console.log(`║   Tasks:`);
    for (const task of result.tasks) {
      console.log(`║     [${task.priority}] ${task.title}`);
    }
  }

  console.log(`╚══\n`);
}

const totals = projects.map(p => analyzeProjectSync(p.name, p.path));
const avgScore = Math.round(totals.reduce((s, t) => s + t.reporank.score, 0) / totals.length);
console.log(`=== Summary: ${totals.length} projects, average score ${avgScore}/100 ===`);
