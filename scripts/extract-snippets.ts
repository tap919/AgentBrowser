import { searchBooks, getCatalog } from '../src/lib/books';
import { writeFileSync } from 'fs';

const QUERIES: Record<string, Array<{ query: string; category?: string; label: string }>> = {
  'TypeScript & React': [
    { query: 'TypeScript interface type generic React hooks state props', category: 'Computers', label: 'TypeScript/React Patterns' },
    { query: 'async await Promise error handling TypeScript', category: 'Computers', label: 'Async TypeScript' },
  ],
  'Python & Algorithms': [
    { query: 'Python list comprehension generator decorator context manager', category: 'Computers', label: 'Python Idioms' },
    { query: 'algorithm sort search data structure complexity', category: 'Computers', label: 'Algorithms & Data Structures' },
    { query: 'data science pandas numpy filtering groupby', category: 'Computers', label: 'Data Science Python' },
  ],
  'Distributed Systems': [
    { query: 'consensus replication partition CAP theorem consistency', category: 'Computers', label: 'Distributed Systems Core' },
    { query: 'transaction isolation serializable two-phase commit', category: 'Computers', label: 'Transactions & Isolation' },
  ],
  'Software Engineering': [
    { query: 'code review testing continuous deployment refactoring', category: 'Computers', label: 'Engineering Practices' },
    { query: 'microservice monolith API design integration', category: 'Computers', label: 'Architecture & Design' },
  ],
  'AI & ML': [
    { query: 'deep learning neural network training optimization gradient', category: 'Computers', label: 'Deep Learning' },
    { query: 'machine learning classification regression feature engineering', category: 'Computers', label: 'ML Fundamentals' },
  ],
  'Business & Strategy': [
    { query: 'strategy competitive advantage market positioning growth', category: 'Business', label: 'Business Strategy' },
    { query: 'decision bias heuristic system thinking fast slow', category: 'Business', label: 'Decision Making' },
    { query: 'marketing customer acquisition analytics metrics', category: 'Business', label: 'Marketing & Analytics' },
  ],
  'Math & Statistics': [
    { query: 'linear algebra matrix vector eigenvalue decomposition', category: 'Math', label: 'Linear Algebra' },
    { query: 'statistics probability regression Bayesian hypothesis', category: 'Math', label: 'Statistics & Probability' },
    { query: 'calculus derivative gradient optimization partial', category: 'Math', label: 'Calculus & Optimization' },
  ],
  'Finance & Investing': [
    { query: 'investing valuation portfolio diversification risk', category: 'financial', label: 'Investing & Risk' },
    { query: 'financial analysis ratio DCF discount cash flow', category: 'financial', label: 'Financial Analysis' },
  ],
};

function sanitize(text: string): string {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/["""''"❝❞❮❯]/g, '"')
    .replace(/[—–-]/g, '-')
    .trim();
}

async function main() {
  console.log('Extracting book snippets...\n');
  const lines: string[] = [];
  lines.push('# Book Knowledge Snippets — Fast Recall Reference');
  lines.push(`Generated: ${new Date().toISOString().split('T')[0]}`);
  lines.push('');

  for (const [domain, queries] of Object.entries(QUERIES)) {
    lines.push(`## ${domain}`);
    lines.push('');

    for (const q of queries) {
      lines.push(`### ${q.label}`);
      lines.push(`**Query:** ${q.query}`);
      lines.push('');

      try {
        const hits = searchBooks(q.query, { category: q.category, limit: 3 });
        if (hits.length === 0) {
          lines.push('*No results found*');
          lines.push('');
          continue;
        }

        for (const hit of hits) {
          const title = hit.title || 'Unknown';
          const cleanPassage = sanitize(hit.passage || '');
          if (cleanPassage.length > 30) {
            const truncated = cleanPassage.length > 200 ? cleanPassage.slice(0, 197) + '...' : cleanPassage;
            lines.push(`- **${title}** (score: ${hit.score}): "${truncated}"`);
          }
        }
      } catch (err) {
        lines.push(`*Search error: ${err}*`);
      }
      lines.push('');
    }
  }

  const output = lines.join('\n');
  writeFileSync('docs/BOOK-SNIPPETS.md', output, 'utf-8');
  console.log(`Written ${output.length} chars to docs/BOOK-SNIPPETS.md`);
  console.log(`Domains: ${Object.keys(QUERIES).join(', ')}`);
  console.log(`Total queries: ${Object.values(QUERIES).flat().length}`);
}

main().catch(console.error);
