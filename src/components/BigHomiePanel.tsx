'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Bot, Send, X, Loader2, Circle, ChevronDown, ChevronUp,
  ExternalLink, Search, Globe, Database, RefreshCw,
  Sparkles, AlertCircle, Clock,
} from 'lucide-react';

export type HomieMode = 'browse' | 'research' | 'scrape';

interface ToolInvocation {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'done' | 'error';
  result?: unknown;
  error?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tools?: ToolInvocation[];
  timestamp: string;
}

interface ChatResponse {
  response: unknown;
  stderr?: string;
  exitCode?: number;
  error?: string;
}

const MODE_LABELS: Record<HomieMode, string> = {
  browse: 'Browse',
  research: 'Research',
  scrape: 'Scrape',
};

const MODE_ICONS: Record<HomieMode, React.ElementType> = {
  browse: Globe,
  research: Search,
  scrape: Database,
};

function parseResponseText(response: unknown): string {
  if (!response) return 'No response from Big Homie.';
  if (typeof response === 'string') return response;
  if (typeof response === 'object' && response !== null) {
    const obj = response as Record<string, unknown>;
    if (obj.text && typeof obj.text === 'string') return obj.text;
    if (obj.message && typeof obj.message === 'string') return obj.message;
    if (obj.content && typeof obj.content === 'string') return obj.content;
    if (obj.output && typeof obj.output === 'string') return obj.output;
    return JSON.stringify(response, null, 2);
  }
  return String(response);
}

export default function BigHomiePanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<HomieMode>('browse');
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(true);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const assistantMsg: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      tools: [],
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/big-homie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, mode }),
      });

      const data = await res.json() as ChatResponse;

      if (!res.ok || data.error) {
        setMessages(prev => prev.map(m =>
          m.id === assistantMsg.id
            ? { ...m, content: `Error: ${data.error ?? 'Unknown error'}` }
            : m
        ));
        if (data.error?.includes('not found') || data.error?.includes('not installed')) {
          setConnected(false);
        }
        return;
      }

      setMessages(prev => prev.map(m =>
        m.id === assistantMsg.id
          ? { ...m, content: parseResponseText(data.response) }
          : m
      ));
    } catch (error) {
      setMessages(prev => prev.map(m =>
        m.id === assistantMsg.id
          ? { ...m, content: `Network error: ${error instanceof Error ? error.message : 'Failed to reach Big Homie'}` }
          : m
      ));
      setConnected(false);
    } finally {
      setSending(false);
      void inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const toggleTool = (id: string) => {
    setExpandedTools(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearChat = () => setMessages([]);

  return (
    <div className="w-72 flex-shrink-0 border-l border-border/20 bg-background/30 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-foreground">Big Homie</span>
          <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={() => void clearChat()}
              className="p-1 rounded hover:bg-muted/10 text-muted-foreground/50 hover:text-foreground transition-colors"
              title="Clear chat"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
          <button
            className="p-1 rounded hover:bg-muted/10 text-muted-foreground/50 hover:text-foreground transition-colors"
            title="Disconnect"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Mode selector */}
      <div className="px-3 py-2 border-b border-border/10 flex items-center gap-1">
        {(Object.keys(MODE_LABELS) as HomieMode[]).map(m => {
          const Icon = MODE_ICONS[m];
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${mode === m ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/10 border border-transparent'}`}
            >
              <Icon className="w-3 h-3" />
              {MODE_LABELS[m]}
            </button>
          );
        })}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <Sparkles className="w-8 h-8 text-purple-400/30 mx-auto" />
            <p className="text-xs text-muted-foreground/60">
              Big Homie is your command center.
            </p>
            <p className="text-[10px] text-muted-foreground/40">
              Ask to browse, search, analyze, or automate.
            </p>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className="space-y-1.5">
            {msg.role === 'user' ? (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-xl rounded-tr-sm bg-purple-500/20 border border-purple-500/30 px-3 py-2">
                  <p className="text-xs text-foreground">{msg.content}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-start gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 rounded-xl rounded-tl-sm bg-muted/20 border border-border/30 px-3 py-2">
                    {msg.content ? (
                      <pre className="text-xs text-foreground/90 whitespace-pre-wrap break-words font-mono leading-relaxed">
                        {msg.content}
                      </pre>
                    ) : sending && msg.id === messages[messages.length - 1]?.id ? (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Big Homie is thinking...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                        <AlertCircle className="w-3 h-3" />
                        <span>No response</span>
                      </div>
                    )}
                  </div>
                </div>

                {msg.tools && msg.tools.length > 0 && (
                  <div className="ml-5 space-y-1">
                    {msg.tools.map(tool => (
                      <div key={tool.id} className="rounded-lg border border-border/30 bg-background/30 overflow-hidden">
                        <button
                          onClick={() => void toggleTool(tool.id)}
                          className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] hover:bg-muted/10 transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <Circle className={`w-1.5 h-1.5 ${tool.status === 'done' ? 'fill-emerald-400 text-emerald-400' : tool.status === 'error' ? 'fill-rose-400 text-rose-400' : tool.status === 'running' ? 'fill-amber-400 text-amber-400 animate-pulse' : 'fill-muted-foreground/40 text-muted-foreground/40'}`} />
                            <code className="font-mono text-muted-foreground">{tool.name}</code>
                          </div>
                          {expandedTools.has(tool.id) ? (
                            <ChevronUp className="w-3 h-3 text-muted-foreground/40" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-muted-foreground/40" />
                          )}
                        </button>
                        {expandedTools.has(tool.id) && (
                          <div className="px-2 pb-2">
                            {tool.error ? (
                              <p className="text-[10px] text-rose-400 font-mono">{tool.error}</p>
                            ) : tool.result ? (
                              <pre className="text-[10px] text-muted-foreground/70 font-mono whitespace-pre-wrap break-words">
                                {typeof tool.result === 'string' ? tool.result : JSON.stringify(tool.result, null, 2)}
                              </pre>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1 ml-5 text-[9px] text-muted-foreground/30">
                  <Clock className="w-2.5 h-2.5" />
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border/20">
        {!connected && (
          <div className="mb-2 px-2 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
            <AlertCircle className="w-3 h-3 text-rose-400 flex-shrink-0" />
            <p className="text-[10px] text-rose-400">
              Qwen Code not found.{' '}
              <a
                href="https://qwen.ai"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-rose-300"
              >
                Install it
              </a>{' '}
              and run{' '}
              <code className="font-mono bg-rose-500/10 px-1 rounded">qwen mcp add big-homie python -m mcp_server_main</code>
            </p>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Big Homie..."
            rows={1}
            className="flex-1 px-3 py-2 rounded-lg border border-border/30 bg-background/20 text-xs text-foreground outline-none focus:border-purple-500/30 resize-none placeholder:text-muted-foreground/40 transition-colors"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={() => void sendMessage()}
            disabled={!input.trim() || sending}
            className="flex-shrink-0 p-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-purple-500/30 transition-all"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
