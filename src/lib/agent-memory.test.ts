import { describe, it, expect, beforeEach } from 'vitest';
import { writeMemory, readMemory, searchMemory, deleteMemory, cleanExpiredMemory } from '@/lib/agent-memory';

describe('agent-memory', () => {
  beforeEach(async () => {
    await deleteMemory('test-key');
    await deleteMemory('prefix-key-1', 'test-ns');
    await deleteMemory('prefix-key-2', 'test-ns');
    await deleteMemory('expired-key');
  });

  it('writes and reads a value', async () => {
    await writeMemory({ namespace: 'default', key: 'test-key', value: { hello: 'world' }, agentId: 'test' });
    const result = await readMemory('test-key');
    expect(result).not.toBeNull();
    expect(result!.value).toEqual({ hello: 'world' });
    expect(result!.agentId).toBe('test');
  });

  it('returns null for missing key', async () => {
    const result = await readMemory('nonexistent');
    expect(result).toBeNull();
  });

  it('overwrites existing key', async () => {
    await writeMemory({ namespace: 'default', key: 'test-key', value: 'first', agentId: 'test' });
    await writeMemory({ namespace: 'default', key: 'test-key', value: 'second', agentId: 'test' });
    const result = await readMemory('test-key');
    expect(result!.value).toBe('second');
  });

  it('searches by prefix', async () => {
    await writeMemory({ namespace: 'test-ns', key: 'prefix-key-1', value: 1, agentId: 'test' });
    await writeMemory({ namespace: 'test-ns', key: 'prefix-key-2', value: 2, agentId: 'test' });
    const results = await searchMemory('prefix-key', 'test-ns');
    expect(results).toHaveLength(2);
  });

  it('respects negative TTL as immediate expiry', async () => {
    await writeMemory({ namespace: 'default', key: 'test-key', value: 'gone', agentId: 'test', ttl: -1 });
    const result = await readMemory('test-key');
    expect(result).toBeNull();
  });

  it('deletes a key', async () => {
    await writeMemory({ namespace: 'default', key: 'test-key', value: 'gone', agentId: 'test' });
    const deleted = await deleteMemory('test-key');
    expect(deleted).toBe(true);
    const result = await readMemory('test-key');
    expect(result).toBeNull();
  });

  it('cleanExpiredMemory removes expired entries', async () => {
    await writeMemory({ namespace: 'default', key: 'expired-key', value: 'old', agentId: 'test', ttl: -1 });
    const count = await cleanExpiredMemory();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
