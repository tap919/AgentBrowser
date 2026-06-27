import { searchBooks } from '../src/lib/books';
async function main() {
  for (const q of ['python', 'fastapi', 'data science', 'google', 'typescript', 'react', 'distributed systems']) {
    const r = searchBooks(q, undefined, 1);
    console.log(`${q} → ${r[0]?.title} (${r[0]?.score})`);
  }
}
main();
