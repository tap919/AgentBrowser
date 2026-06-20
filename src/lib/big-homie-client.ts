// src/lib/big-homie-client.ts

type MessageHandler = (data: any) => void;

class BigHomieClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private isConnecting: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  public status: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private seq = 0;
  private correlationId = '';
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_DELAY = 60000;

  constructor() {
    this.url = process.env.NEXT_PUBLIC_BIG_HOMIE_WS_URL || 'ws://localhost:8888/ws';
  }

  public connect(): void {
    if (this.status === 'connected') return;
    if (this.isConnecting) return;

    // Clear any pending reconnect
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    try {
      this.seq = 0;
      this.correlationId = crypto.randomUUID();
      const ws = new WebSocket(this.url);

      ws.onopen = () => {
        if (this.ws !== ws) {
          ws.close();
          return;
        }
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.status = 'connected';
        this.notifyStatusChange();
        this.send({ type: 'get_status' });
      };

      ws.onmessage = (event) => {
        try {
          const envelope = JSON.parse(event.data) as {
            seq?: number;
            correlationId?: string;
            payload?: { type: string };
            type?: string;
          };
          const payload = envelope.payload ?? (envelope as { type: string });
          if ('seq' in envelope && 'correlationId' in envelope) {
            /* debug: seq=${envelope.seq} correlationId=${envelope.correlationId} type=${payload.type} */
          }
          this.emit(payload.type, payload);
        } catch (err) {
          console.error('Failed to parse Big Homie message', err);
        }
      };

      ws.onclose = () => {
        this.isConnecting = false;
        if (this.ws !== ws) return;
        this.status = 'disconnected';
        this.ws = null;
        this.notifyStatusChange();
        this.scheduleReconnect();
      };

      ws.onerror = () => {
        this.isConnecting = false;
        ws.close();
      };

      this.ws = ws;
      this.isConnecting = true;
      this.status = 'connecting';
      this.notifyStatusChange();
    } catch (err) {
      console.error('Failed to initialize WebSocket', err);
      this.isConnecting = false;
      this.status = 'disconnected';
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), this.MAX_RECONNECT_DELAY);
    /* debug: Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}) */
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  public send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.seq += 1;
      const envelope = {
        seq: this.seq,
        correlationId: this.correlationId,
        payload: data,
      };
      this.ws.send(JSON.stringify(envelope));
    } else {
      console.warn('Cannot send message, Big Homie is not connected');
    }
  }

  public on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }
  
  public off(type: string, handler: MessageHandler) {
    if (this.handlers.has(type)) {
      const filtered = this.handlers.get(type)!.filter(h => h !== handler);
      this.handlers.set(type, filtered);
    }
  }

  private eventBusPromise: Promise<any> | null = null;

  private getEventBus() {
    if (!this.eventBusPromise) {
      this.eventBusPromise = import('./agent-event-bus').then(m => m.agentEventBus).catch(() => null);
    }
    return this.eventBusPromise;
  }

  private emit(type: string, data: any) {
    if (this.handlers.has(type)) {
      this.handlers.get(type)!.forEach(handler => handler(data));
    }
    // Bridge to shared event bus using valid EventType, proxy original type in payload
    this.getEventBus().then(bus => {
      if (bus) {
        bus.emit('state_change', 'big-homie-client', { bhType: type, ...data }, false);
      }
    });
  }

  private notifyStatusChange() {
    this.emit('connection_status', { status: this.status });
  }

  public chat(message: string, model: string = 'general') {
    this.send({ type: 'chat', message, model });
  }
  
  public fetchTools() {
    this.send({ type: 'get_tools' });
  }

  /** HTTP health check — returns true if Big Homie is reachable */
  public async checkHealth(): Promise<boolean> {
    try {
      const apiUrl = this.url.replace('ws://', 'http://').replace('wss://', 'https://').replace('/ws', '');
      const response = await fetch(`${apiUrl}/tools/status`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /** Execute a skill via Big Homie HTTP API */
  public async executeSkill(skill: string, config: Record<string, unknown>): Promise<unknown> {
    const apiUrl = this.url.replace('ws://', 'http://').replace('wss://', 'https://').replace('/ws', '');
    try {
      const response = await fetch(`${apiUrl}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill, config }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        throw new Error(`Big Homie responded with ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      return {
        status: 'error',
        skill,
        note: `Failed to execute skill on Big Homie: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null; // prevent reconnect on intentional close
      this.ws.close();
      this.ws = null;
    }
    this.isConnecting = false;
    this.status = 'disconnected';
    this.notifyStatusChange();
  }
}

export const bigHomie = new BigHomieClient();
