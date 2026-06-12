import { describe, it, expect } from 'vitest';
import { formatStars, TRENDING_REPOS, getReposByCategory, findRepoByName, getTotalStars } from './trending-repos';

describe('formatStars', () => {
  it('formats thousands as k', () => {
    expect(formatStars(86000)).toBe('86k');
  });

  it('formats with decimal for non-round', () => {
    expect(formatStars(15500)).toBe('15.5k');
  });

  it('returns string for small numbers', () => {
    expect(formatStars(500)).toBe('500');
  });

  it('handles zero', () => {
    expect(formatStars(0)).toBe('0');
  });
});

describe('TRENDING_REPOS', () => {
  it('has repos', () => {
    expect(TRENDING_REPOS.length).toBeGreaterThan(0);
  });

  it('each repo has required fields', () => {
    for (const r of TRENDING_REPOS) {
      expect(r).toHaveProperty('name');
      expect(r).toHaveProperty('repo');
      expect(r).toHaveProperty('stars');
      expect(r).toHaveProperty('category');
      expect(r).toHaveProperty('description');
    }
  });
});

describe('getReposByCategory', () => {
  it('returns all repos for "all"', () => {
    expect(getReposByCategory('all').length).toBe(TRENDING_REPOS.length);
  });

  it('filters by browser category', () => {
    const browser = getReposByCategory('browser');
    expect(browser.every(r => r.category === 'browser')).toBe(true);
  });
});

describe('findRepoByName', () => {
  it('finds a repo by name', () => {
    const repo = findRepoByName('browser-use');
    expect(repo).not.toBeUndefined();
    expect(repo!.name).toBe('browser-use');
  });

  it('returns undefined for missing', () => {
    expect(findRepoByName('nonexistent')).toBeUndefined();
  });
});

describe('getTotalStars', () => {
  it('calculates total across repos', () => {
    const total = getTotalStars(TRENDING_REPOS);
    expect(total).toBeGreaterThan(0);
    expect(Number.isFinite(total)).toBe(true);
  });
});
