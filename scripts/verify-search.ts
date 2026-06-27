import { getCatalog, searchBooks } from '../src/lib/books';

const catalog = getCatalog();
const indexed = catalog.filter(b => b.indexed);
console.log(`Total files: ${catalog.length}, Indexed: ${indexed.length}`);

// Group by category
const cats: Record<string, number> = {};
for (const b of indexed) cats[b.category] = (cats[b.category] || 0) + 1;
for (const [cat, n] of Object.entries(cats)) console.log(`  ${cat}: ${n}`);

// Test searches
for (const q of ['python', 'data structure', 'distributed systems', 'react', 'typescript', 'machine learning', 'google']) {
  const r = searchBooks(q);
  if (r.length > 0) {
    const top = r[0];
    console.log(`\n"${q}" → ${top.title} (${top.category}) score=${top.score}`);
    console.log(`   Passage: ${top.passage.substring(0, 120).replace(/\n/g, ' ')}`);
  }
}
