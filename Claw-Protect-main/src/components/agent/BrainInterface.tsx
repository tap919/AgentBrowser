import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, 
  Terminal, 
  Cpu, 
  MessageSquare, 
  Send, 
  Loader2, 
  ShieldAlert,
  CheckCircle2,
  Info,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { securityAgent } from '@/lib/gemini';
import { mockTelemetry } from '@/lib/mockData';
import { motion } from 'motion/react';

export function BrainInterface() {
  const [messages, setMessages] = useState<any[]>([
    {
      role: 'agent',
      content: "Claw Protect Core Brain initialized. I am monitoring your endpoint, network, and data signals in real-time. How can I assist with your security posture today?",
      timestamp: new Date().toLocaleTimeString(),
      type: 'system'
    }
  ]);
  const [input, setInput] = useState('');
  const [isReasoning, setIsReasoning] = useState(false);
  const [reasoningLog, setReasoningLog] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsReasoning(true);

    // Simulate agent reasoning
    const result = await securityAgent.reason({
      ...mockTelemetry,
      userQuery: input
    });

    setIsReasoning(false);
    setReasoningLog(result);

    const agentMessage = {
      role: 'agent',
      content: result.summary,
      timestamp: new Date().toLocaleTimeString(),
      recommendations: result.recommendations,
      threatLevel: result.threatLevel
    };

    setMessages(prev => [...prev, agentMessage]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
      <Card className="lg:col-span-2 flex flex-col bg-card/40 border-border/50 backdrop-blur-md overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">AI Security Agent</CardTitle>
                <CardDescription className="text-xs font-mono">LLM-BASED REASONING ENGINE v2.0</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest border-emerald-500/30 text-emerald-500">
              Autonomous Mode
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full p-6" ref={scrollRef}>
            <div className="space-y-6">
              {messages.map((msg, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`p-4 rounded-2xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-tr-none' 
                        : 'bg-muted/50 border border-border/50 rounded-tl-none'
                    }`}>
                      {msg.content}
                      
                      {msg.recommendations && (
                        <div className="mt-4 space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Recommended Actions:</p>
                          {msg.recommendations.map((rec: string, j: number) => (
                            <div key={j} className="flex items-start gap-2 text-xs bg-background/30 p-2 rounded-lg border border-white/5">
                              <ChevronRight className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                              <span>{rec}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono px-1">{msg.timestamp}</p>
                  </div>
                </motion.div>
              ))}
              {isReasoning && (
                <div className="flex justify-start">
                  <div className="bg-muted/30 border border-border/30 p-4 rounded-2xl rounded-tl-none flex items-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-xs font-mono animate-pulse">Agent is reasoning over telemetry...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>

        <CardFooter className="p-4 border-t border-border/50 bg-muted/10">
          <div className="flex w-full gap-3">
            <Input 
              placeholder="Ask the agent about security events or policies..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="bg-background/50 border-border/50"
            />
            <Button onClick={handleSend} disabled={isReasoning || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      <div className="space-y-6">
        <Card className="bg-card/40 border-border/50 backdrop-blur-md">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-mono uppercase tracking-widest">Reasoning Log</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {reasoningLog ? (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-background/50 border border-border/50 font-mono text-[11px] leading-relaxed">
                  <span className="text-primary font-bold">LOG_ENTRY:</span> {reasoningLog.reasoning}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-background/50 border border-border/50 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-mono mb-1">Threat Level</p>
                    <p className={`text-xl font-bold ${reasoningLog.threatLevel > 50 ? 'text-destructive' : 'text-emerald-500'}`}>
                      {reasoningLog.threatLevel}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-background/50 border border-border/50 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-mono mb-1">Confidence</p>
                    <p className="text-xl font-bold text-primary">94%</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-32 flex flex-col items-center justify-center text-muted-foreground opacity-50 border-2 border-dashed border-border/50 rounded-xl">
                <Cpu className="w-8 h-8 mb-2" />
                <p className="text-xs font-mono">Waiting for inference...</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/40 border-border/50 backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Active Guardrails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <GuardrailItem icon={CheckCircle2} label="Explainable Decisions" status="Active" color="text-emerald-500" />
            <GuardrailItem icon={ShieldAlert} label="Human-in-the-loop" status="Threshold: High" color="text-amber-500" />
            <GuardrailItem icon={Info} label="Immutable Audit Trail" status="Encrypted" color="text-blue-500" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function GuardrailItem({ icon: Icon, label, status, color }: any) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/20">
      <div className="flex items-center gap-2">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className="text-[10px] font-mono text-muted-foreground">{status}</span>
    </div>
  );
}
