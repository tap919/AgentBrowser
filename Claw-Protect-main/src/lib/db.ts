import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'claw-protect.db');

// Ensure data dir exists
fs.mkdirSync(DATA_DIR, { recursive: true });

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type PlanTier = 'free' | 'pro' | 'enterprise';

export interface ApiKeyRecord {
  key: string;
  email: string;
  plan: PlanTier;
  stripeCustomerId?: string;
  createdAt: string;
  usageCount: number;
  lastUsed?: string;
  active: boolean;
}

export interface ApiUsageEntry {
  key: string;
  endpoint: string;
  timestamp: string;
  statusCode: number;
  module?: string;
}

export interface StripeProductRecord {
  tier: 'pro' | 'enterprise';
  productId: string;
  priceId: string;
  updatedAt: string;
}

export interface KevEntry {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
  knownRansomwareCampaignUse: 'Known' | 'Unknown';
  notes: string;
  cwes: string; // JSON array string
}

export interface FeedMetadata {
  source: string;
  lastFetched: string;
  entryCount: number;
  feedVersion: string;
  catalogVersion: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Database Singleton
// ─────────────────────────────────────────────────────────────────────────────

let _db: InstanceType<typeof Database> | null = null;

export function getDb(): InstanceType<typeof Database> {
  if (_db) return _db;

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('synchronous = NORMAL');
  _db.pragma('foreign_keys = ON');

  migrate(_db);
  return _db;
}

// ─────────────────────────────────────────────────────────────────────────────
// Migrations
// ─────────────────────────────────────────────────────────────────────────────

function migrate(db: InstanceType<typeof Database>): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const current = (db.prepare('SELECT MAX(version) as v FROM schema_version').get() as { v: number | null }).v ?? 0;

  const migrations: Array<{ version: number; sql: string }> = [
    {
      version: 1,
      sql: `
        -- API Keys
        CREATE TABLE IF NOT EXISTS api_keys (
          key           TEXT PRIMARY KEY,
          email         TEXT NOT NULL,
          plan          TEXT NOT NULL CHECK(plan IN ('free','pro','enterprise')),
          stripe_customer_id TEXT,
          created_at    TEXT NOT NULL,
          usage_count   INTEGER NOT NULL DEFAULT 0,
          last_used     TEXT,
          active        INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_api_keys_email ON api_keys(email);
        CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(active);

        -- API Usage Log
        CREATE TABLE IF NOT EXISTS api_usage (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          key         TEXT NOT NULL,
          endpoint    TEXT NOT NULL,
          timestamp   TEXT NOT NULL,
          status_code INTEGER NOT NULL,
          module      TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_api_usage_key ON api_usage(key);
        CREATE INDEX IF NOT EXISTS idx_api_usage_ts ON api_usage(timestamp);

        -- Stripe Products
        CREATE TABLE IF NOT EXISTS stripe_products (
          tier        TEXT PRIMARY KEY CHECK(tier IN ('pro','enterprise')),
          product_id  TEXT NOT NULL,
          price_id    TEXT NOT NULL,
          updated_at  TEXT NOT NULL
        );

        -- CISA KEV Feed
        CREATE TABLE IF NOT EXISTS kev_entries (
          cve_id                       TEXT PRIMARY KEY,
          vendor_project               TEXT NOT NULL,
          product                      TEXT NOT NULL,
          vulnerability_name           TEXT NOT NULL,
          date_added                   TEXT NOT NULL,
          short_description            TEXT NOT NULL,
          required_action              TEXT NOT NULL,
          due_date                     TEXT NOT NULL,
          known_ransomware_campaign_use TEXT NOT NULL,
          notes                        TEXT NOT NULL DEFAULT '',
          cwes                         TEXT NOT NULL DEFAULT '[]'
        );
        CREATE INDEX IF NOT EXISTS idx_kev_date_added ON kev_entries(date_added);
        CREATE INDEX IF NOT EXISTS idx_kev_vendor ON kev_entries(vendor_project);
        CREATE INDEX IF NOT EXISTS idx_kev_ransomware ON kev_entries(known_ransomware_campaign_use);

        -- Feed Metadata
        CREATE TABLE IF NOT EXISTS feed_metadata (
          source          TEXT PRIMARY KEY,
          last_fetched    TEXT NOT NULL,
          entry_count     INTEGER NOT NULL DEFAULT 0,
          feed_version    TEXT NOT NULL DEFAULT '',
          catalog_version TEXT NOT NULL DEFAULT ''
        );
      `,
    },
  ];

  for (const m of migrations) {
    if (m.version > current) {
      const runMigration = db.transaction(() => {
        db.exec(m.sql);
        db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(m.version, new Date().toISOString());
      });
      runMigration();
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API Key Operations
// ─────────────────────────────────────────────────────────────────────────────

export const apiKeyDb = {
  getAll(): ApiKeyRecord[] {
    return (getDb().prepare('SELECT * FROM api_keys').all() as Record<string, unknown>[]).map(rowToApiKey);
  },

  getByKey(key: string): ApiKeyRecord | null {
    const row = getDb().prepare('SELECT * FROM api_keys WHERE key = ?').get(key) as Record<string, unknown> | undefined;
    return row ? rowToApiKey(row) : null;
  },

  insert(record: ApiKeyRecord): void {
    getDb().prepare(`
      INSERT INTO api_keys (key, email, plan, stripe_customer_id, created_at, usage_count, last_used, active)
      VALUES (@key, @email, @plan, @stripe_customer_id, @created_at, @usage_count, @last_used, @active)
    `).run({
      key: record.key,
      email: record.email,
      plan: record.plan,
      stripe_customer_id: record.stripeCustomerId ?? null,
      created_at: record.createdAt,
      usage_count: record.usageCount,
      last_used: record.lastUsed ?? null,
      active: record.active ? 1 : 0,
    });
  },

  updateUsage(key: string, lastUsed: string, usageCount: number): void {
    getDb().prepare(`
      UPDATE api_keys SET last_used = ?, usage_count = ? WHERE key = ?
    `).run(lastUsed, usageCount, key);
  },

  updatePlan(key: string, plan: PlanTier, stripeCustomerId?: string): void {
    getDb().prepare(`
      UPDATE api_keys SET plan = ?, stripe_customer_id = COALESCE(?, stripe_customer_id) WHERE key = ?
    `).run(plan, stripeCustomerId ?? null, key);
  },

  deactivateByCustomer(stripeCustomerId: string): void {
    getDb().prepare(`UPDATE api_keys SET plan = 'free' WHERE stripe_customer_id = ?`).run(stripeCustomerId);
  },

  /** Monthly usage count for billing quota checks */
  monthlyUsage(key: string): number {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const result = getDb().prepare(`
      SELECT COUNT(*) as cnt FROM api_usage
      WHERE key = ? AND timestamp >= ?
    `).get(key, monthStart.toISOString()) as { cnt: number };
    return result.cnt;
  },

  /** Import from legacy JSON file (one-time migration) */
  importFromJson(filePath: string): number {
    if (!fs.existsSync(filePath)) return 0;
    try {
      const legacy = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ApiKeyRecord[];
      const insert = getDb().prepare(`
        INSERT OR IGNORE INTO api_keys (key, email, plan, stripe_customer_id, created_at, usage_count, last_used, active)
        VALUES (@key, @email, @plan, @stripe_customer_id, @created_at, @usage_count, @last_used, @active)
      `);
      const insertAll = getDb().transaction((rows: ApiKeyRecord[]) => {
        for (const r of rows) insert.run({
          key: r.key,
          email: r.email,
          plan: r.plan,
          stripe_customer_id: r.stripeCustomerId ?? null,
          created_at: r.createdAt,
          usage_count: r.usageCount,
          last_used: r.lastUsed ?? null,
          active: r.active ? 1 : 0,
        });
      });
      insertAll(legacy);
      return legacy.length;
    } catch { return 0; }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// API Usage Log Operations
// ─────────────────────────────────────────────────────────────────────────────

export const usageDb = {
  append(entry: ApiUsageEntry): void {
    getDb().prepare(`
      INSERT INTO api_usage (key, endpoint, timestamp, status_code, module)
      VALUES (@key, @endpoint, @timestamp, @status_code, @module)
    `).run({
      key: entry.key,
      endpoint: entry.endpoint,
      timestamp: entry.timestamp,
      status_code: entry.statusCode,
      module: entry.module ?? null,
    });
    // Prune to last 50,000 entries (async-ish: every 500 writes)
    const id = (getDb().prepare('SELECT MAX(id) as m FROM api_usage').get() as { m: number }).m;
    if (id % 500 === 0) {
      getDb().prepare('DELETE FROM api_usage WHERE id <= (SELECT MIN(id) FROM (SELECT id FROM api_usage ORDER BY id DESC LIMIT 50000))').run();
    }
  },

  getRecent(limit = 100): ApiUsageEntry[] {
    return (getDb().prepare('SELECT * FROM api_usage ORDER BY id DESC LIMIT ?').all(limit) as Record<string, unknown>[]).map(rowToUsage);
  },

  getByKey(key: string, limit = 500): ApiUsageEntry[] {
    return (getDb().prepare('SELECT * FROM api_usage WHERE key = ? ORDER BY id DESC LIMIT ?').all(key, limit) as Record<string, unknown>[]).map(rowToUsage);
  },

  importFromJson(filePath: string): number {
    if (!fs.existsSync(filePath)) return 0;
    try {
      const legacy = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ApiUsageEntry[];
      const insert = getDb().prepare(`
        INSERT OR IGNORE INTO api_usage (key, endpoint, timestamp, status_code, module)
        VALUES (@key, @endpoint, @timestamp, @status_code, @module)
      `);
      const insertAll = getDb().transaction((rows: ApiUsageEntry[]) => {
        for (const r of rows) insert.run({
          key: r.key, endpoint: r.endpoint, timestamp: r.timestamp,
          status_code: r.statusCode, module: r.module ?? null,
        });
      });
      insertAll(legacy.slice(-10000)); // import last 10k
      return legacy.length;
    } catch { return 0; }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Stripe Products
// ─────────────────────────────────────────────────────────────────────────────

export const stripeDb = {
  get(tier: 'pro' | 'enterprise'): StripeProductRecord | null {
    const row = getDb().prepare('SELECT * FROM stripe_products WHERE tier = ?').get(tier) as Record<string, unknown> | undefined;
    return row ? { tier: row.tier as 'pro' | 'enterprise', productId: row.product_id as string, priceId: row.price_id as string, updatedAt: row.updated_at as string } : null;
  },

  upsert(record: StripeProductRecord): void {
    getDb().prepare(`
      INSERT INTO stripe_products (tier, product_id, price_id, updated_at)
      VALUES (@tier, @product_id, @price_id, @updated_at)
      ON CONFLICT(tier) DO UPDATE SET product_id = @product_id, price_id = @price_id, updated_at = @updated_at
    `).run({ tier: record.tier, product_id: record.productId, price_id: record.priceId, updated_at: record.updatedAt });
  },

  importFromJson(filePath: string): void {
    if (!fs.existsSync(filePath)) return;
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, { productId: string; priceId: string }>;
      for (const [tier, ids] of Object.entries(data)) {
        if (tier === 'pro' || tier === 'enterprise') {
          this.upsert({ tier, productId: ids.productId, priceId: ids.priceId, updatedAt: new Date().toISOString() });
        }
      }
    } catch { /* ignore */ }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// KEV Feed Operations
// ─────────────────────────────────────────────────────────────────────────────

export const kevDb = {
  upsertMany(entries: KevEntry[]): void {
    const upsert = getDb().prepare(`
      INSERT INTO kev_entries
        (cve_id, vendor_project, product, vulnerability_name, date_added,
         short_description, required_action, due_date, known_ransomware_campaign_use, notes, cwes)
      VALUES
        (@cve_id, @vendor_project, @product, @vulnerability_name, @date_added,
         @short_description, @required_action, @due_date, @known_ransomware_campaign_use, @notes, @cwes)
      ON CONFLICT(cve_id) DO UPDATE SET
        vendor_project = @vendor_project,
        product = @product,
        vulnerability_name = @vulnerability_name,
        date_added = @date_added,
        short_description = @short_description,
        required_action = @required_action,
        due_date = @due_date,
        known_ransomware_campaign_use = @known_ransomware_campaign_use,
        notes = @notes,
        cwes = @cwes
    `);
    const upsertAll = getDb().transaction((rows: KevEntry[]) => {
      for (const e of rows) upsert.run({
        cve_id: e.cveID,
        vendor_project: e.vendorProject,
        product: e.product,
        vulnerability_name: e.vulnerabilityName,
        date_added: e.dateAdded,
        short_description: e.shortDescription,
        required_action: e.requiredAction,
        due_date: e.dueDate,
        known_ransomware_campaign_use: e.knownRansomwareCampaignUse,
        notes: e.notes,
        cwes: e.cwes,
      });
    });
    upsertAll(entries);
  },

  getByCveId(cveId: string): KevEntry | null {
    const row = getDb().prepare('SELECT * FROM kev_entries WHERE cve_id = ?').get(cveId) as Record<string, unknown> | undefined;
    return row ? rowToKev(row) : null;
  },

  isKnownExploited(cveId: string): boolean {
    const row = getDb().prepare('SELECT 1 FROM kev_entries WHERE cve_id = ?').get(cveId);
    return !!row;
  },

  getByProduct(vendor: string, product: string): KevEntry[] {
    return (getDb().prepare(`
      SELECT * FROM kev_entries
      WHERE LOWER(vendor_project) LIKE LOWER(?) AND LOWER(product) LIKE LOWER(?)
    `).all(`%${vendor}%`, `%${product}%`) as Record<string, unknown>[]).map(rowToKev);
  },

  getRecent(days = 30, limit = 100): KevEntry[] {
    const since = new Date(Date.now() - days * 86400_000).toISOString().split('T')[0];
    return (getDb().prepare(`
      SELECT * FROM kev_entries WHERE date_added >= ? ORDER BY date_added DESC LIMIT ?
    `).all(since, limit) as Record<string, unknown>[]).map(rowToKev);
  },

  getRansomwareLinked(): KevEntry[] {
    return (getDb().prepare(`
      SELECT * FROM kev_entries WHERE known_ransomware_campaign_use = 'Known' ORDER BY date_added DESC
    `).all() as Record<string, unknown>[]).map(rowToKev);
  },

  search(query: string, limit = 50): KevEntry[] {
    const q = `%${query.toLowerCase()}%`;
    return (getDb().prepare(`
      SELECT * FROM kev_entries
      WHERE LOWER(cve_id) LIKE ?
         OR LOWER(vendor_project) LIKE ?
         OR LOWER(product) LIKE ?
         OR LOWER(vulnerability_name) LIKE ?
         OR LOWER(short_description) LIKE ?
      ORDER BY date_added DESC
      LIMIT ?
    `).all(q, q, q, q, q, limit) as Record<string, unknown>[]).map(rowToKev);
  },

  paginate(page: number, pageSize: number): { entries: KevEntry[]; total: number } {
    const total = (getDb().prepare('SELECT COUNT(*) as cnt FROM kev_entries').get() as { cnt: number }).cnt;
    const offset = (page - 1) * pageSize;
    const entries = (getDb().prepare('SELECT * FROM kev_entries ORDER BY date_added DESC LIMIT ? OFFSET ?').all(pageSize, offset) as Record<string, unknown>[]).map(rowToKev);
    return { entries, total };
  },

  count(): number {
    return (getDb().prepare('SELECT COUNT(*) as cnt FROM kev_entries').get() as { cnt: number }).cnt;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Feed Metadata
// ─────────────────────────────────────────────────────────────────────────────

export const feedMetaDb = {
  get(source: string): FeedMetadata | null {
    const row = getDb().prepare('SELECT * FROM feed_metadata WHERE source = ?').get(source) as Record<string, unknown> | undefined;
    return row ? {
      source: row.source as string,
      lastFetched: row.last_fetched as string,
      entryCount: row.entry_count as number,
      feedVersion: row.feed_version as string,
      catalogVersion: row.catalog_version as string,
    } : null;
  },

  upsert(meta: FeedMetadata): void {
    getDb().prepare(`
      INSERT INTO feed_metadata (source, last_fetched, entry_count, feed_version, catalog_version)
      VALUES (@source, @last_fetched, @entry_count, @feed_version, @catalog_version)
      ON CONFLICT(source) DO UPDATE SET
        last_fetched = @last_fetched,
        entry_count = @entry_count,
        feed_version = @feed_version,
        catalog_version = @catalog_version
    `).run({
      source: meta.source,
      last_fetched: meta.lastFetched,
      entry_count: meta.entryCount,
      feed_version: meta.feedVersion,
      catalog_version: meta.catalogVersion,
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Row mappers
// ─────────────────────────────────────────────────────────────────────────────

function rowToApiKey(r: Record<string, unknown>): ApiKeyRecord {
  return {
    key: r.key as string,
    email: r.email as string,
    plan: r.plan as PlanTier,
    stripeCustomerId: r.stripe_customer_id as string | undefined,
    createdAt: r.created_at as string,
    usageCount: r.usage_count as number,
    lastUsed: r.last_used as string | undefined,
    active: (r.active as number) === 1,
  };
}

function rowToUsage(r: Record<string, unknown>): ApiUsageEntry {
  return {
    key: r.key as string,
    endpoint: r.endpoint as string,
    timestamp: r.timestamp as string,
    statusCode: r.status_code as number,
    module: r.module as string | undefined,
  };
}

function rowToKev(r: Record<string, unknown>): KevEntry {
  return {
    cveID: r.cve_id as string,
    vendorProject: r.vendor_project as string,
    product: r.product as string,
    vulnerabilityName: r.vulnerability_name as string,
    dateAdded: r.date_added as string,
    shortDescription: r.short_description as string,
    requiredAction: r.required_action as string,
    dueDate: r.due_date as string,
    knownRansomwareCampaignUse: r.known_ransomware_campaign_use as 'Known' | 'Unknown',
    notes: r.notes as string,
    cwes: r.cwes as string,
  };
}
