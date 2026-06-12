import { EventEmitter } from 'events';
import { db } from '@/lib/db';

export type EventType = 'discovery' | 'alert' | 'artifact' | 'decision' | 'error' | 'state_change' | 'agent:started' | 'agent:completed' | 'agent:failed' | 'memory:write' | 'pipeline:started' | 'pipeline:completed' | 'pipeline:failed' | 'trigger:content-from-intel' | 'trigger:business-from-content';

export interface AgentEvent {
  id: string;
  type: EventType;
  source: string;
  timestamp: string;
  payload: Record<string, unknown>;
  durable: boolean;
}

type EventHandler = (event: AgentEvent) => void;

class AgentEventBus {
  private emitter = new EventEmitter();
  private recentEvents: AgentEvent[] = [];
  private readonly MAX_RECENT = 500;

  emit(type: EventType, source: string, payload: Record<string, unknown>, durable = false): AgentEvent {
    const event: AgentEvent = {
      id: crypto.randomUUID(),
      type,
      source,
      timestamp: new Date().toISOString(),
      payload,
      durable,
    };

    this.recentEvents.unshift(event);
    if (this.recentEvents.length > this.MAX_RECENT) {
      this.recentEvents = this.recentEvents.slice(0, this.MAX_RECENT);
    }

    this.emitter.emit(type, event);
    this.emitter.emit('*', event);

    if (durable) {
      this.persistEvent(event);
    }

    return event;
  }

  on(type: EventType | '*', handler: EventHandler): () => void {
    const wrapped = (event: AgentEvent) => {
      if (type === '*' || event.type === type) {
        handler(event);
      }
    };
    this.emitter.on(type, wrapped);
    return () => {
      this.emitter.off(type, wrapped);
    };
  }

  async replay(type?: EventType, since?: Date): Promise<AgentEvent[]> {
    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (since) where.timestamp = { gte: since };

    const records = await db.agentEvent.findMany({
      where: where as never,
      orderBy: { timestamp: 'desc' },
      take: 200,
    });

    return records.map(r => ({
      id: r.id,
      type: r.type as EventType,
      source: r.source,
      timestamp: r.timestamp.toISOString(),
      payload: JSON.parse(r.payload),
      durable: r.durable,
    }));
  }

  getRecent(type?: EventType, limit = 50): AgentEvent[] {
    if (type) {
      return this.recentEvents.filter(e => e.type === type).slice(0, limit);
    }
    return this.recentEvents.slice(0, limit);
  }

  private async persistEvent(event: AgentEvent): Promise<void> {
    try {
      await db.agentEvent.create({
        data: {
          id: event.id,
          type: event.type,
          source: event.source,
          timestamp: new Date(event.timestamp),
          payload: JSON.stringify(event.payload),
          durable: event.durable,
        },
      });
    } catch (err) {
      console.error('[AgentEventBus] Failed to persist event:', err);
    }
  }
}

export const agentEventBus = new AgentEventBus();
