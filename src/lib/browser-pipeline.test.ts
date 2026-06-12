import { describe, it, expect } from 'vitest';
import { createBrowserTask, executeBrowserTask, extractBySelectors, extractReadable, stripHtml } from '@/lib/browser-pipeline';

describe('browser-pipeline', () => {
  describe('createBrowserTask', () => {
    it('creates a task with the given action and url', () => {
      const task = createBrowserTask('reader', 'https://example.com');
      expect(task.action).toBe('reader');
      expect(task.url).toBe('https://example.com');
      expect(task.id).toBeTruthy();
    });

    it('accepts optional selectors', () => {
      const task = createBrowserTask('extract', 'https://example.com', ['h1', '.content']);
      expect(task.selectors).toEqual(['h1', '.content']);
    });
  });

  describe('stripHtml', () => {
    it('removes HTML tags', () => {
      expect(stripHtml('<p>Hello</p>').trim()).toBe('Hello');
    });

    it('removes script tags and their content', () => {
      const html = '<div>Keep</div><script>alert("remove")</script><p>Me</p>';
      expect(stripHtml(html).replace(/\s+/g, ' ').trim()).toBe('Keep Me');
    });

    it('removes style tags and their content', () => {
      const html = '<style>.cls{color:red}</style><p>Visible</p>';
      expect(stripHtml(html).replace(/\s+/g, ' ').trim()).toBe('Visible');
    });
  });

  describe('extractReadable', () => {
    it('extracts readable content from body', () => {
      const html = '<html><body><h1>Title</h1><p>Content here</p></body></html>';
      const result = extractReadable(html);
      expect(result).toContain('Title');
      expect(result).toContain('Content here');
    });

    it('returns stripped content when no body tag', () => {
      const result = extractReadable('Just some text without body tags');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('executeBrowserTask', () => {
    it('rejects non-http/https URLs', async () => {
      const task = createBrowserTask('reader', 'file:///etc/passwd');
      const result = await executeBrowserTask(task);
      expect(result.success).toBe(false);
      expect(result.error).toContain('http');
    });

    it('rejects empty protocol URLs', async () => {
      const task = createBrowserTask('reader', 'javascript:alert(1)');
      const result = await executeBrowserTask(task);
      expect(result.success).toBe(false);
    });
  });
});
