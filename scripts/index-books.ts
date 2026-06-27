import { scanAndIndex } from '../src/lib/books';
async function main() {
  const info = await scanAndIndex();
  console.log(`Indexed ${info.length} books`);
}
main();
