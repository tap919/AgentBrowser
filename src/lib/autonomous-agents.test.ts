import { describe, it, expect } from 'vitest';
import { AUTONOMOUS_AGENT_PRESETS, runPresetAgent, describeCron } from '@/lib/autonomous-agents';

describe('autonomous-agents presets', () => {
  it('has business-daily preset', () => {
    const agent = AUTONOMOUS_AGENT_PRESETS.find(a => a.id === 'business-daily');
    expect(agent).toBeDefined();
    expect(agent!.cronExpression).toBe('0 7 * * 1-5');
    expect(agent!.skills).toContain('business-routine');
  });

  it('has business-weekly preset', () => {
    const agent = AUTONOMOUS_AGENT_PRESETS.find(a => a.id === 'business-weekly');
    expect(agent).toBeDefined();
    expect(agent!.config.routines).toContain('scan-trends');
  });

  it('has self-upgrade-scanner preset', () => {
    const agent = AUTONOMOUS_AGENT_PRESETS.find(a => a.id === 'self-upgrade-scanner');
    expect(agent).toBeDefined();
    expect(agent!.config.autoCreateJobs).toBe(true);
  });

  it('runPresetAgent handles business-daily', () => {
    const agent = AUTONOMOUS_AGENT_PRESETS.find(a => a.id === 'business-daily')!;
    const output = runPresetAgent(agent);
    expect(output).not.toBeNull();
    expect(output!.summary).toContain('Daily business routine');
  });

  it('runPresetAgent handles self-upgrade-scanner', () => {
    const agent = AUTONOMOUS_AGENT_PRESETS.find(a => a.id === 'self-upgrade-scanner')!;
    const output = runPresetAgent(agent);
    expect(output).not.toBeNull();
    expect(output!.maxRecommendations).toBe(3);
  });

  it('describeCron handles new expressions', () => {
    expect(describeCron('0 7 * * 1-5')).toBe('Weekdays at 07:00');
    expect(describeCron('0 9 * * 1')).toBe('Weekly Monday at 09:00');
    expect(describeCron('0 6 * * 0')).toBe('Weekly Sunday at 06:00');
  });
});
