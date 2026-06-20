/**
 * CISA Known Exploited Vulnerabilities (KEV) Service
 *
 * Polls the CISA KEV catalog on startup and every 6 hours.
 * Stores entries in SQLite so data survives restarts.
 * Exposes a query interface used by supply chain, compliance,
 * and ransomware defense modules.
 *
 * Feed URL: https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json
 * Docs:     https://www.cisa.gov/known-exploited-vulnerabilities-catalog
 */

import { kevDb, feedMetaDb, type KevEntry } from '../db.js';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CISA_KEV_URL =
  'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';

const FEED_SOURCE = 'cisa-kev';
const POLL_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const STALE_THRESHOLD_MS = 7 * 60 * 60 * 1000; // re-fetch if > 7h old
const FETCH_TIMEOUT_MS = 30_000;

// ─────────────────────────────────────────────────────────────────────────────
// Raw CISA response shape
// ─────────────────────────────────────────────────────────────────────────────

interface CisaKevResponse {
  title: string;
  catalogVersion: string;
  dateReleased: string;
  count: number;
  vulnerabilities: CisaVulnerability[];
}

interface CisaVulnerability {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
  knownRansomwareCampaignUse: string;
  notes: string;
  cwes?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// KEV Service
// ─────────────────────────────────────────────────────────────────────────────

export interface KevServiceStatus {
  initialized: boolean;
  entryCount: number;
  lastFetched: string | null;
  catalogVersion: string | null;
  nextFetchAt: string | null;
  lastError: string | null;
  feedUrl: string;
}

class KevService {
  private initialized = false;
  private lastFetched: Date | null = null;
  private catalogVersion: string | null = null;
  private lastError: string | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private fetchPromise: Promise<void> | null = null;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /** Call once on server startup. Returns immediately, fetch is async. */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    // Restore last-fetch metadata from DB
    const meta = feedMetaDb.get(FEED_SOURCE);
    if (meta) {
      this.lastFetched = new Date(meta.lastFetched);
      this.catalogVersion = meta.catalogVersion;
    }

    // Fetch if never fetched or stale
    const isStale = !this.lastFetched || Date.now() - this.lastFetched.getTime() > STALE_THRESHOLD_MS;
    if (isStale) {
      this.fetchAndStore().catch((e) => console.error('[KEV] Initial fetch failed:', e));
    }

    // Schedule periodic refresh
    this.schedulePoll();
  }

  /** Graceful shutdown — clears poll timer */
  shutdown(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  // ── Fetch & Store ──────────────────────────────────────────────────────────

  async fetchAndStore(): Promise<{ count: number; isNew: boolean }> {
    // Deduplicate concurrent fetches
    if (this.fetchPromise) {
      await this.fetchPromise;
      return { count: kevDb.count(), isNew: false };
    }

    let resolvePromise!: () => void;
    this.fetchPromise = new Promise((r) => (resolvePromise = r));

    try {
      const data = await this.fetchJson<CisaKevResponse>(CISA_KEV_URL);

      // Bail if nothing changed (catalog version is the same)
      if (this.catalogVersion && this.catalogVersion === data.catalogVersion) {
        this.lastFetched = new Date();
        feedMetaDb.upsert({
          source: FEED_SOURCE,
          lastFetched: this.lastFetched.toISOString(),
          entryCount: data.count,
          feedVersion: data.dateReleased,
          catalogVersion: data.catalogVersion,
        });
        return { count: data.count, isNew: false };
      }

      // Map and upsert
      const entries: KevEntry[] = data.vulnerabilities.map((v) => ({
        cveID: v.cveID,
        vendorProject: v.vendorProject,
        product: v.product,
        vulnerabilityName: v.vulnerabilityName,
        dateAdded: v.dateAdded,
        shortDescription: v.shortDescription,
        requiredAction: v.requiredAction,
        dueDate: v.dueDate,
        knownRansomwareCampaignUse: v.knownRansomwareCampaignUse === 'Known' ? 'Known' : 'Unknown',
        notes: v.notes ?? '',
        cwes: JSON.stringify(v.cwes ?? []),
      }));

      kevDb.upsertMany(entries);

      this.lastFetched = new Date();
      this.catalogVersion = data.catalogVersion;
      this.lastError = null;

      feedMetaDb.upsert({
        source: FEED_SOURCE,
        lastFetched: this.lastFetched.toISOString(),
        entryCount: data.count,
        feedVersion: data.dateReleased,
        catalogVersion: data.catalogVersion,
      });

      return { count: entries.length, isNew: true };

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.lastError = msg;
      console.error('[KEV] Fetch failed:', msg);
      throw err;
    } finally {
      this.fetchPromise = null;
      resolvePromise();
    }
  }

  private schedulePoll(): void {
    this.pollTimer = setTimeout(async () => {
      try {
        await this.fetchAndStore();
      } catch { /* logged above */ }
      this.schedulePoll();
    }, POLL_INTERVAL_MS);
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return res.json() as Promise<T>;
    } finally {
      clearTimeout(timer);
    }
  }

  // ── Query API (used by security modules) ──────────────────────────────────

  /**
   * Check if a CVE ID is in the CISA KEV catalog.
   * Fast O(1) SQLite primary-key lookup.
   */
  isKnownExploited(cveId: string): boolean {
    return kevDb.isKnownExploited(cveId.toUpperCase());
  }

  /** Enrich a CVE with KEV metadata. Returns null if not in catalog. */
  enrichCve(cveId: string): KevEntry | null {
    return kevDb.getByCveId(cveId.toUpperCase());
  }

  /** All KEV entries for a vendor+product combo (fuzzy match). */
  getByProduct(vendor: string, product: string): KevEntry[] {
    return kevDb.getByProduct(vendor, product);
  }

  /** KEV entries added in the last N days (default 30). */
  getRecentKevs(days = 30, limit = 100): KevEntry[] {
    return kevDb.getRecent(days, limit);
  }

  /** All KEV entries linked to ransomware campaigns. */
  getRansomwareLinkedKevs(): KevEntry[] {
    return kevDb.getRansomwareLinked();
  }

  /** Full-text search across CVE ID, vendor, product, description. */
  search(query: string, limit = 50): KevEntry[] {
    return kevDb.search(query, limit);
  }

  /** Paginated full catalog listing. */
  paginate(page: number, pageSize: number): { entries: KevEntry[]; total: number } {
    return kevDb.paginate(page, pageSize);
  }

  /** Total number of KEV entries in DB. */
  count(): number {
    return kevDb.count();
  }

  /** Service status for the /api/v1/threat-intel/status endpoint. */
  getStatus(): KevServiceStatus {
    const nextFetch = this.lastFetched
      ? new Date(this.lastFetched.getTime() + POLL_INTERVAL_MS).toISOString()
      : null;

    return {
      initialized: this.initialized,
      entryCount: kevDb.count(),
      lastFetched: this.lastFetched?.toISOString() ?? null,
      catalogVersion: this.catalogVersion,
      nextFetchAt: nextFetch,
      lastError: this.lastError,
      feedUrl: CISA_KEV_URL,
    };
  }
}

// Singleton export
export const kevService = new KevService();
export type { KevEntry };
