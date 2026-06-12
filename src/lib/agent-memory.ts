import { db } from '@/lib/db';

export interface MemoryEntry {
  namespace: string;
  key: string;
  value: unknown;
  agentId: string;
  ttl?: number; // seconds from write; 0 or negative = immediate expiry
}

export interface MemoryReadResult {
  namespace: string;
  key: string;
  value: unknown;
  agentId: string;
  updatedAt: string;
}

const DEFAULT_NS = 'default';

function computeExpiresAt(ttl: number | undefined): Date | null {
  if (ttl === undefined || ttl === null) return null;
  return new Date(Date.now() + ttl * 1000);
}

function isExpired(entry: { expiresAt: Date | null }): boolean {
  if (!entry.expiresAt) return false;
  return Date.now() >= entry.expiresAt.getTime();
}

export async function cleanExpiredMemory(): Promise<number> {
  const deleted = await db.agentMemory.deleteMany({
    where: {
      expiresAt: { not: null, lte: new Date() },
    },
  });
  return deleted.count;
}

export async function writeMemory(opts: MemoryEntry): Promise<void> {
  const value = typeof opts.value === 'string' ? opts.value : JSON.stringify(opts.value);
  const ns = opts.namespace || DEFAULT_NS;
  await db.agentMemory.upsert({
    where: { namespace_key: { namespace: ns, key: opts.key } },
    update: {
      value,
      agentId: opts.agentId,
      expiresAt: computeExpiresAt(opts.ttl),
    },
    create: {
      agentId: opts.agentId,
      namespace: ns,
      key: opts.key,
      value,
      expiresAt: computeExpiresAt(opts.ttl),
    },
  });
}

export async function readMemory(
  key: string,
  namespace?: string,
): Promise<MemoryReadResult | null> {
  const ns = namespace || DEFAULT_NS;
  const entry = await db.agentMemory.findUnique({
    where: { namespace_key: { namespace: ns, key } },
  });
  if (!entry) return null;
  if (isExpired(entry)) {
    await db.agentMemory.delete({ where: { id: entry.id } });
    return null;
  }
  return {
    namespace: entry.namespace,
    key: entry.key,
    value: tryParse(entry.value),
    agentId: entry.agentId,
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export async function searchMemory(
  prefix: string,
  namespace?: string,
): Promise<MemoryReadResult[]> {
  const ns = namespace || DEFAULT_NS;
  const entries = await db.agentMemory.findMany({
    where: {
      namespace: ns,
      key: { startsWith: prefix },
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } },
      ],
    },
    orderBy: { updatedAt: 'desc' },
  });
  const results: MemoryReadResult[] = [];
  for (const entry of entries) {
    if (isExpired(entry)) {
      await db.agentMemory.delete({ where: { id: entry.id } });
      continue;
    }
    results.push({
      namespace: entry.namespace,
      key: entry.key,
      value: tryParse(entry.value),
      agentId: entry.agentId,
      updatedAt: entry.updatedAt.toISOString(),
    });
  }
  return results;
}

export async function deleteMemory(key: string, namespace?: string): Promise<boolean> {
  const ns = namespace || DEFAULT_NS;
  try {
    await db.agentMemory.delete({
      where: { namespace_key: { namespace: ns, key } },
    });
    return true;
  } catch {
    return false;
  }
}

function tryParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
