import { NextResponse } from 'next/server';
import { scanAndIndex } from '@/lib/books';

export async function POST() {
  try {
    const books = await scanAndIndex();
    return NextResponse.json({
      indexed: books.filter(b => b.indexed).length,
      total: books.length,
      books,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Indexing failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
