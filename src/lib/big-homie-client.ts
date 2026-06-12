// src/lib/big-homie-client.ts

type MessageHandler = (data: any) => void;

class BigHomieClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private isConnecting: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  public status: 'disconnected' | 'connecting' | 'connected' = 'disconnected';

  constructor() {
    this.url = process.env.NEXT_PUBLIC_BIG_HOMIE_WS_URL || 'ws://localhost:8888/ws';
  }

  public connect(): void {
    if (this.status === 'connected') return;
    if (this.isConnecting) return;

    this.isConnecting = true;
    this.status = 'connecting';
    this.notifyStatusChange();

    // Clear any pending reconnect
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    try {
      const ws = new WebSocket(this.url);

      ws.onopen = () => {
        if (this.ws !== ws) {
          ws.close();
          return;
        }
        this.isConnecting = false;
        this.status = 'connected';
        this.notifyStatusChange();
        this.send({ type: 'get_status' });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as { type: string };
          this.emit(data.type, data);
        } catch (err) {
          console.error('Failed to parse Big Homie message', err);
        }
      };

      ws.onclose = () => {
        if (this.ws !== ws) return;
        this.isConnecting = false;
        this.status = 'disconnected';
        this.ws = null;
        this.notifyStatusChange();
        this.scheduleReconnect();
      };

      ws.onerror = () => {
        ws.close();
      };

      this.ws = ws;
    } catch (err) {
      console.error('Failed to initialize WebSocket', err);
      this.isConnecting = false;
      this.status = 'disconnected';
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 5000);
  }

  public send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
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

  private emit(type: string, data: any) {
    if (this.handlers.has(type)) {
      this.handlers.get(type)!.forEach(handler => handler(data));
    }
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
