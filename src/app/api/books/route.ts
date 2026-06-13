import { NextResponse } from 'next/server';
import { getCatalog, scanAndIndex } from '@/lib/books';

export async function GET() {
  try {
    const catalog = getCatalog();
    return NextResponse.json({
      catalog,
      total: catalog.length,
      indexed: catalog.filter(b => b.indexed).length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to read catalog';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST() {
  try {
    const books = await scanAndIndex();
    return NextResponse.json({
      books,
      total: books.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to index books';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
