import { vi } from 'vitest';

// Mock Prisma so unit tests don't need a real DB
vi.mock('@/lib/db', () => ({
  db: {
    pipeline: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'test-id' }),
      update: vi.fn().mockResolvedValue({ id: 'test-id' }),
      delete: vi.fn().mockResolvedValue({ id: 'test-id' }),
    },
    agentMemory: {
      upsert: vi.fn().mockResolvedValue({}),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    workflowRun: {
      create: vi.fn().mockResolvedValue({ id: 'run-id' }),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

// Mock node-cron so scheduled tasks don't spin up
vi.mock('node-cron', () => ({
  default: { schedule: vi.fn().mockReturnValue({ stop: vi.fn() }) },
}));
