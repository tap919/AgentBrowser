import { describe, it, expect } from 'vitest';
import { recordProRevenue, getProRevenueSummary, recordCompetitiveSignal } from '@/lib/economic-engine';

describe('economic-engine', () => {
  describe('pro-revenue', () => {
    it('tracks revenue entries and provides summary', () => {
      recordProRevenue({
        date: '2026-06-01',
        pro: 'ASCAP',
        workTitle: 'Test Song',
        amount: 50,
        type: 'performance',
        period: '2026-Q2',
      });
      recordProRevenue({
        date: '2026-06-01',
        pro: 'MLC',
        workTitle: 'Another Song',
        amount: 30,
        type: 'mechanical',
        period: '2026-Q2',
      });

      const summary = getProRevenueSummary();
      expect(summary.total).toBe(80);
      expect(summary.byPro['ASCAP']).toBe(50);
      expect(summary.byPro['MLC']).toBe(30);
      expect(summary.byType['performance']).toBe(50);
      expect(summary.byType['mechanical']).toBe(30);
    });

    it('aggregates multiple entries for same PRO', () => {
      recordProRevenue({ date: '2026-06-02', pro: 'ASCAP', workTitle: 'Song A', amount: 25, type: 'performance', period: '2026-Q2' });
      recordProRevenue({ date: '2026-06-03', pro: 'ASCAP', workTitle: 'Song B', amount: 75, type: 'performance', period: '2026-Q2' });

      const summary = getProRevenueSummary();
      expect(summary.byPro['ASCAP']).toBe(150); // 50 + 25 + 75
    });
  });

  describe('competitive-signals', () => {
    it('records a signal without throwing', () => {
      expect(() => {
        recordCompetitiveSignal({
          competitor: 'TestCorp',
          signal: 'New product launch',
          severity: 'warning',
          source: 'web-scraping',
          detectedAt: new Date().toISOString(),
        });
      }).not.toThrow();
    });
  });
});
