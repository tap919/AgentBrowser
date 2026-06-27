import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const TEXT_DIR = join(process.cwd(), 'data', 'books', '.text');

const KEY_BOOKS: Record<string, string[]> = {
  'Business/thinking-fast-and-slow.txt': ['system 1', 'system 2', 'bias', 'heuristic', 'intuitive', 'decision'],
  'Business/diary-of-a-ceo.txt': ['strategy', 'marketing', 'growth', 'brand', 'success', 'business'],
  'Computers/software-engineering-at-google.txt': ['code review', 'testing', 'deploy', 'continuous', 'refactor'],
  'Computers/serious-python.txt': ['decorator', 'generator', 'context', 'iterator', 'python'],
  'Computers/practical-deep-learning-python-intro.txt': ['neural', 'gradient', 'training', 'deep learning', 'network'],
  'Computers/big-book-data-science-2025.txt': ['pandas', 'dataframe', 'data', 'filter', 'group'],
  'Computers/building-data-science-apps-fastapi.txt': ['fastapi', 'async', 'endpoint', 'api', 'python'],
  'Computers/the-complete-developer-ts-react-nextjs.txt': ['typescript', 'interface', 'react', 'hook', 'component'],
  'Math/essential-math-for-data-science.txt': ['matrix', 'vector', 'probability', 'distribution', 'regression'],
  'financial/art-of-statistics.txt': ['statistics', 'probability', 'data', 'model', 'inference'],
  'Computers/beyond-basic-stuff-python.txt': ['python', 'code', 'function', 'list', 'dict'],
  'Computers/dive-into-algorithms-python.txt': ['algorithm', 'sort', 'search', 'complexity'],
  'Computers/automate-the-boring-stuff-2nd-ed.txt': ['python', 'automate', 'file', 'regex', 'web'],
  'Computers/big-book-data-science-part1-2025.txt': ['pandas', 'dataframe', 'data', 'filter', 'group'],
  'Computers/ceh-study-guide-2025.txt': ['security', 'hack', 'port', 'network', 'attack'],
  'Math/essential-math-for-ai-2023.txt': ['machine learning', 'neural', 'probability', 'bayesian'],
  'financial/50-business-classics.txt': ['business', 'management', 'leadership', 'strategy'],
  'financial/how-to-day-trade.txt': ['trade', 'stock', 'market', 'risk', 'strategy'],
};

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ')
    .replace(/[""'']/g, "'").replace(/[—–-]/g, '-').replace(/\s+/g, ' ').trim();
}

function clean(s: string): string {
  // Remove non-printable chars but keep basic ASCII and punctuation
  return s.replace(/[^\x20-\x7E\s]/g, '').trim();
}

function isGoodLine(l: string): boolean {
  if (l.length < 80 || l.length > 500) return false;
  if (!/^[A-Z]/.test(l)) return false;
  // Skip boilerplate
  if (/(copyright|All rights reserved|No part of this|Published by|ISBN|www\.|http|Printed in|Subject|Library of Congress)/i.test(l)) return false;
  // Must contain actual content words
  if (!/[.!?]$/.test(l) && !/\b(is|are|was|were|has|have|can|will|should|must|provides|enables|allows|uses|defines|refers|means|involves|represents|describes|contains|includes|requires|suggests|demonstrates|illustrates|highlights)\b/i.test(l)) return false;
  return true;
}

function main(): void {
  const out: string[] = [];
  out.push('# Book Knowledge Snippets — Fast Recall Reference');
  out.push('> Clean snippets from indexed books. Use for quick reference during coding, architecture, business, and analysis work.');
  out.push('');
  out.push('## Contents');
  for (const bookPath of Object.keys(KEY_BOOKS)) {
    const name = bookPath.split('/')[1].replace(/\.\w+$/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    out.push(`- ${name}`);
  }
  out.push('');

  for (const [bookPath, keywords] of Object.entries(KEY_BOOKS)) {
    const fp = join(TEXT_DIR, bookPath);
    const bookName = bookPath.split('/')[1].replace(/\.\w+$/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    out.push(`## ${bookName}`);
    out.push('');

    if (!existsSync(fp)) {
      out.push('*Not indexed yet*');
      out.push('');
      continue;
    }

    const content = readFileSync(fp, 'utf-8');
    const lines = content.split('\n').map(l => clean(stripHtml(l))).filter(isGoodLine);

    let count = 0;
    for (let i = 0; i < lines.length && count < 6; i++) {
      const kwMatch = keywords.filter(k => lines[i].toLowerCase().includes(k.toLowerCase())).length;
      if (kwMatch >= 1) {
        const snippet = lines[i].length > 320 ? lines[i].slice(0, 317) + '...' : lines[i];
        out.push(`- ${snippet}`);
        count++;
      }
    }
    if (count === 0) {
      for (let i = 0; i < lines.length && count < 3; i++) {
        const snippet = lines[i].length > 320 ? lines[i].slice(0, 317) + '...' : lines[i];
        out.push(`- ${snippet}`);
        count++;
      }
    }
    out.push('');
  }

  out.push('---');
  out.push(`Generated: ${new Date().toISOString().split('T')[0]}`);

  writeFileSync('docs/BOOK-SNIPPETS.md', out.join('\n'), 'utf-8');
  console.log(`Written ${out.join('\n').length} chars to docs/BOOK-SNIPPETS.md`);
  console.log(`Books: ${Object.keys(KEY_BOOKS).length}`);
}

main();
