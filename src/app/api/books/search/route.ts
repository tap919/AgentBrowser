import { NextRequest, NextResponse } from 'next/server';
import { searchBooks } from '@/lib/books';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, category, limit } = body;
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }
    const results = searchBooks(query, { category, limit });
    return NextResponse.json({ results, total: results.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Search failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
