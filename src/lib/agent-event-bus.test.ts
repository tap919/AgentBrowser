import { describe, it, expect } from 'vitest';
import { agentEventBus } from '@/lib/agent-event-bus';

describe('agent-event-bus', () => {
  it('emits and receives events', () => {
    const received: string[] = [];
    const unsub = agentEventBus.on('discovery', (event) => {
      received.push(event.payload.topic as string);
    });

    agentEventBus.emit('discovery', 'test', { topic: 'new-trend' }, false);
    expect(received).toContain('new-trend');
    unsub();
  });

  it('unsubscribes handlers', () => {
    let count = 0;
    const unsub = agentEventBus.on('alert', () => { count++; });
    unsub();
    agentEventBus.emit('alert', 'test', {}, false);
    expect(count).toBe(0);
  });

  it('receives wildcard events', () => {
    const events: string[] = [];
    const unsub = agentEventBus.on('*', (e) => { events.push(e.type); });

    agentEventBus.emit('discovery', 'src1', {}, false);
    agentEventBus.emit('alert', 'src2', {}, false);

    expect(events).toContain('discovery');
    expect(events).toContain('alert');
    unsub();
  });

  it('maintains recent event buffer', () => {
    // Use a unique type to avoid cross-test contamination
    const testType = 'state_change';
    for (let i = 0; i < 100; i++) {
      agentEventBus.emit(testType, 'test', { index: i }, false);
    }
    const recent = agentEventBus.getRecent(testType, 10);
    expect(recent).toHaveLength(10);
  });

  it('getRecent filters by type', () => {
    const typeA = 'artifact';
    const typeB = 'decision';
    agentEventBus.emit(typeA, 'src', { n: 1 }, false);
    agentEventBus.emit(typeB, 'src', { n: 2 }, false);

    const aEvents = agentEventBus.getRecent(typeA);
    expect(aEvents).toHaveLength(1);
    expect(aEvents[0].type).toBe(typeA);

    const bEvents = agentEventBus.getRecent(typeB);
    expect(bEvents).toHaveLength(1);
    expect(bEvents[0].type).toBe(typeB);
  });
});
