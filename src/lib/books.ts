import * as fs from 'node:fs';
import * as path from 'node:path';

const BOOKS_DIR = path.join(process.cwd(), 'data', 'books');
const TEXT_DIR = path.join(BOOKS_DIR, '.text');

export interface BookInfo {
  id: string;
  title: string;
  author?: string;
  category: string;
  format: string;
  filePath: string;
  textPath?: string;
  indexed: boolean;
}

export interface BookSearchHit {
  bookId: string;
  title: string;
  author?: string;
  category: string;
  passage: string;
  score: number;
}

const VARIANT_DIRS: Record<string, string> = {
  'financial': 'financial',
  'Game Development': 'Game Development',
  'Health Fitness': 'Health Fitness',
};

function bookTitle(filePath: string): string {
  const base = path.basename(filePath);
  const stripped = base.replace(/\.(pdf|epub|txt|md)$/i, '');
  return stripped.replace(/[_-]/g, ' ');
}

async function getPdfText(filePath: string): Promise<string> {
  const { PDFParse } = await Function('return import("pdf-parse")')() as { PDFParse: new (opts: { data: Uint8Array }) => { getText(opts: { pageJoiner: string }): Promise<{ text: string }>; destroy(): void } };
  const buf = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  const result = await parser.getText({ pageJoiner: '\n\n---\n\n' });
  parser.destroy();
  return result.text;
}

// @ts-ignore - dynamic import hidden from webpack static analysis (epub uses node:fs/promises)
type EpubConstructor = new (filePath: string) => { parse(): Promise<void>; toc: { id: string }[]; getChapter(id: string): Promise<string> };

async function getEpubText(filePath: string): Promise<string> {
  const { default: EPub } = await Function('return import("epub")')() as { default: EpubConstructor };
  const book = new EPub(filePath);
  await book.parse();
  const chapters = await Promise.all(
    book.toc.map(ch => book.getChapter(ch.id).catch(() => ''))
  );
  return chapters.filter(Boolean).join('\n\n');
}

function getTextFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

function ensureTextDir(category: string): string {
  const dir = path.join(TEXT_DIR, category);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function indexBook(filePath: string): Promise<BookInfo | null> {
  const ext = path.extname(filePath).toLowerCase();
  const rel = path.relative(BOOKS_DIR, filePath);
  const parts = rel.split(path.sep);
  if (parts.length < 2) return null;
  const category = parts[0];
  const catDir = ensureTextDir(category);
  const textName = path.basename(filePath, path.extname(filePath)) + '.txt';
  const textPath = path.join(catDir, textName);

  if (fs.existsSync(textPath)) {
    return {
      id: rel.replace(/[\\\/]/g, '_').toLowerCase(),
      title: bookTitle(filePath),
      category,
      format: ext.slice(1),
      filePath,
      textPath,
      indexed: true,
    };
  }

  let text: string;
  try {
    if (ext === '.pdf') {
      text = await getPdfText(filePath);
    } else if (ext === '.epub') {
      text = await getEpubText(filePath);
    } else if (ext === '.txt' || ext === '.md') {
      text = getTextFile(filePath);
    } else {
      return null;
    }
  } catch {
    return null;
  }

  fs.writeFileSync(textPath, text, 'utf-8');
  return {
    id: rel.replace(/[\\\/]/g, '_').toLowerCase(),
    title: bookTitle(filePath),
    category,
    format: ext.slice(1),
    filePath,
    textPath,
    indexed: true,
  };
}

export async function scanAndIndex(): Promise<BookInfo[]> {
  const results: BookInfo[] = [];
  const entries = fs.readdirSync(BOOKS_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.text' || !entry.isDirectory()) continue;
    const category = entry.name;
    const catPath = path.join(BOOKS_DIR, category);
    const files = fs.readdirSync(catPath);
    for (const file of files) {
      const filePath = path.join(catPath, file);
      if (!fs.statSync(filePath).isFile()) continue;
      const info = await indexBook(filePath);
      if (info) results.push(info);
    }
  }
  return results;
}

export function getCatalog(): BookInfo[] {
  const results: BookInfo[] = [];
  const entries = fs.readdirSync(BOOKS_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.text' || !entry.isDirectory()) continue;
    const category = entry.name;
    const catPath = path.join(BOOKS_DIR, category);
    const files = fs.readdirSync(catPath);
    for (const file of files) {
      const filePath = path.join(catPath, file);
      if (!fs.statSync(filePath).isFile()) continue;
      const ext = path.extname(filePath).toLowerCase();
      const rel = path.relative(BOOKS_DIR, filePath);
      const textName = path.basename(filePath, path.extname(filePath)) + '.txt';
      const textPath = path.join(TEXT_DIR, category, textName);
      results.push({
        id: rel.replace(/[\\\/]/g, '_').toLowerCase(),
        title: bookTitle(filePath),
        category,
        format: ext.slice(1),
        filePath,
        textPath: fs.existsSync(textPath) ? textPath : undefined,
        indexed: fs.existsSync(textPath),
      });
    }
  }
  return results;
}

export function searchBooks(query: string, options?: { category?: string; limit?: number }): BookSearchHit[] {
  const { category, limit = 10 } = options || {};
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const hits: BookSearchHit[] = [];
  const catalog = getCatalog().filter(b => b.indexed);
  for (const book of catalog) {
    if (category && book.category !== category) continue;
    const text = fs.readFileSync(book.textPath!, 'utf-8');
    const lines = text.split('\n');

    let matchCount = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      const matched = words.filter(w => line.includes(w));
      if (matched.length >= Math.min(2, words.length)) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      // Collect the most relevant passage
      let bestScore = 0;
      let bestPassage = '';
      for (let i = 0; i < lines.length; i++) {
        const lineLower = lines[i].toLowerCase();
        const matched = words.filter(w => lineLower.includes(w));
        if (matched.length > bestScore) {
          bestScore = matched.length;
          const start = Math.max(0, i - 2);
          const end = Math.min(lines.length, i + 3);
          bestPassage = lines.slice(start, end).join('\n');
        }
      }

      hits.push({
        bookId: book.id,
        title: book.title,
        author: book.author,
        category: book.category,
        passage: bestPassage,
        score: matchCount,
      });
    }
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
