'use client';

import { useState, useCallback, useEffect } from 'react';
import { BookOpen, Monitor } from 'lucide-react';
import { Readability, isProbablyReaderable } from '@mozilla/readability';
import DOMPurify from 'dompurify';

interface ReaderModeProps {
  url?: string;
  html?: string;
}

interface ParsedArticle {
  title: string;
  content: string;
  textContent: string;
  length: number;
  excerpt: string;
  byline: string;
  siteName: string;
  lang: string;
}

export default function ReaderMode({ html }: ReaderModeProps) {
  const [article, setArticle] = useState<ParsedArticle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState('system-ui');
  const [lineHeight, setLineHeight] = useState(1.6);

  const parseArticle = useCallback(async () => {
    if (!html) {
      setError('No page content available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create a DOM parser
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Check if it's probably readable
      if (!isProbablyReaderable(doc)) {
        setError('This page does not appear to be an article');
        setLoading(false);
        return;
      }

      // Parse with Readability
      const reader = new Readability(doc);
      const parsed = reader.parse();
      
      if (parsed) {
        setArticle({
          ...(parsed as ParsedArticle),
          content: DOMPurify.sanitize(parsed.content || ''),
        });
      } else {
        setError('Could not parse article content');
      }
    } catch (err) {
      console.error('Reader mode error:', err);
      setError('Failed to parse article');
    } finally {
      setLoading(false);
    }
  }, [html]);

  useEffect(() => {
    parseArticle();
  }, [parseArticle]);

  const fontOptions = [
    { value: 'system-ui', label: 'System' },
    { value: 'Georgia, serif', label: 'Serif' },
    { value: '"Times New Roman", serif', label: 'Times' },
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: 'monospace', label: 'Mono' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <span className="text-sm font-medium text-foreground">Reader Mode</span>
          {article?.siteName && (
            <span className="text-xs text-muted-foreground">{article.siteName}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Font size */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-background/40 border border-border/30">
            <button
              onClick={() => setFontSize(s => Math.max(12, s - 2))}
              className="p-1 rounded hover:bg-background/60 text-xs"
            >
              A-
            </button>
            <span className="text-xs text-foreground min-w-[30px] text-center">{fontSize}</span>
            <button
              onClick={() => setFontSize(s => Math.min(32, s + 2))}
              className="p-1 rounded hover:bg-background/60 text-xs"
            >
              A+
            </button>
          </div>

          {/* Font family */}
          <select
            value={fontFamily}
            onChange={e => setFontFamily(e.target.value)}
            className="px-2 py-1 text-xs rounded-lg border border-border/30 bg-background/40 text-foreground"
          >
            {fontOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Line height */}
          <select
            value={lineHeight}
            onChange={e => setLineHeight(Number(e.target.value))}
            className="px-2 py-1 text-xs rounded-lg border border-border/30 bg-background/40 text-foreground"
          >
            <option value={1.4}>Compact</option>
            <option value={1.6}>Normal</option>
            <option value={1.8}>Relaxed</option>
            <option value={2.0}>Spacious</option>
          </select>

        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Extracting article...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <Monitor className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-foreground mb-2">{error}</p>
              <button
                onClick={parseArticle}
                className="text-xs text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {article && (
          <article 
            className="max-w-2xl mx-auto py-8 px-6"
            style={{ 
              fontFamily, 
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight,
            }}
          >
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {article.title}
            </h1>

            {(article.byline || article.siteName) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6 pb-4 border-b border-border/20">
                {article.byline && <span>{article.byline}</span>}
                {article.siteName && <span>· {article.siteName}</span>}
              </div>
            )}

            {article.excerpt && (
              <p className="text-lg text-muted-foreground mb-6 italic">
                {article.excerpt}
              </p>
            )}

            <div 
              className="prose prose-invert max-w-none text-foreground/90"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />

            <div className="mt-8 pt-4 border-t border-border/20 text-xs text-muted-foreground">
              {article.length} characters · Reader Mode
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
