import { describe, it, expect } from 'vitest';
import { executeUpgrade } from '@/lib/upgrade-executor';
import { MASSIVE_UPGRADE_SWEEP } from '@/lib/upgrade-sweep';

describe('upgrade-executor', () => {
  it('returns a report for a valid target', async () => {
    const target = MASSIVE_UPGRADE_SWEEP[0];
    const report = await executeUpgrade(target);
    expect(report).toBeDefined();
    expect(report.outcome).toBe('success');
    expect(report.touchedSystems).toContain(target.targetId);
    expect(report.durationSeconds).toBeGreaterThanOrEqual(0);
    expect(report.finishedAt).toBeTruthy();
  });

  it('includes followUp items in report', async () => {
    const target = MASSIVE_UPGRADE_SWEEP[1];
    const report = await executeUpgrade(target);
    expect(report.followUp.length).toBeGreaterThan(0);
  });

  it('produces a valid summary string', async () => {
    const target = MASSIVE_UPGRADE_SWEEP[0];
    const report = await executeUpgrade(target);
    expect(report.summary.length).toBeGreaterThan(10);
    expect(report.summary).toContain(target.targetName);
  });
});
