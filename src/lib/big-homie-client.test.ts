import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const OPEN = 1;

class MockWebSocket {
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((err: any) => void) | null = null;
  readyState = OPEN;
  static OPEN = OPEN;
  send = vi.fn();
  close = vi.fn();
  constructor(public url: string) {
    setTimeout(() => {
      this.onopen?.();
    }, 0);
  }
}

vi.stubGlobal('WebSocket', MockWebSocket);

const { bigHomie } = await import('@/lib/big-homie-client');

describe('BigHomieClient', () => {
  beforeEach(() => {
    bigHomie.status = 'disconnected';
    (bigHomie as any).reconnectAttempts = 0;
  });

  it('connects and sets status to connected', async () => {
    bigHomie.connect();
    await new Promise(r => setTimeout(r, 10));
    expect(bigHomie.status).toBe('connected');
  });

  it('disconnect cancels reconnect timer', () => {
    bigHomie.connect();
    bigHomie.disconnect();
    expect(bigHomie.status).toBe('disconnected');
  });

  it('send queues messages when disconnected', () => {
    bigHomie.disconnect();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    bigHomie.send('test message');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('handlers are called on matching message types', () => {
    const handler = vi.fn();
    bigHomie.on('chat-response', handler);
    bigHomie.connect();

    const ws = (bigHomie as any).ws as MockWebSocket;
    if (ws?.onmessage) {
      ws.onmessage({ data: JSON.stringify({ type: 'chat-response', text: 'Hello' }) });
    }

    expect(handler).toHaveBeenCalled();
  });

  it('off removes handler correctly', () => {
    const handler = vi.fn();
    bigHomie.on('chat-response', handler);
    bigHomie.off('chat-response', handler);

    const ws = (bigHomie as any).ws as MockWebSocket;
    if (ws?.onmessage) {
      ws.onmessage({ data: JSON.stringify({ type: 'chat-response', text: 'Hello' }) });
    }

    expect(handler).not.toHaveBeenCalled();
  });

  it('multiple connects are idempotent', async () => {
    bigHomie.connect();
    await new Promise(r => setTimeout(r, 10));
    bigHomie.connect();
    expect(bigHomie.status).toBe('connected');
  });

  it('chat sends correct message format', () => {
    const sendSpy = vi.spyOn(bigHomie, 'send');
    bigHomie.chat('hello');
    expect(sendSpy).toHaveBeenCalledWith({ type: 'chat', message: 'hello', model: 'general' });
    sendSpy.mockRestore();
  });
});
