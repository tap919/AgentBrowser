import React from 'react';
import { 
  Laptop, 
  ShieldCheck, 
  Cpu, 
  HardDrive, 
  Usb, 
  Activity,
  Lock,
  Search,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { mockTelemetry } from '@/lib/mockData';

export function EndpointStatus() {
  const { endpoint } = mockTelemetry;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
            <Laptop className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Endpoint Protection</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="bg-emerald-500/5 text-emerald-500 border-emerald-500/20">
                <ShieldCheck className="w-3 h-3 mr-1" />
                NGAV Active
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">Device ID: CLAW-LP-8821</span>
            </div>
          </div>
        </div>
        <Button className="gap-2">
          <Search className="w-4 h-4" />
          Full System Scan
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card/40 border-border/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg">Real-time Process Monitor</CardTitle>
            <CardDescription>Behavioral analysis of active system processes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ProcessItem name="kernel_task" cpu="2.4%" memory="1.2 GB" status="Trusted" />
              <ProcessItem name="ClawAgent.exe" cpu="1.8%" memory="450 MB" status="System" />
              <ProcessItem name="WindowServer" cpu="4.2%" memory="890 MB" status="Trusted" />
              <ProcessItem name="Chrome.exe" cpu="12.5%" memory="2.4 GB" status="Verified" />
              <ProcessItem name="Unknown_Proc_X" cpu="0.1%" memory="12 MB" status="Quarantined" warning />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-card/40 border-border/50 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">Peripheral Control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {endpoint.usbDevices.map((device, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/20">
                  <div className="flex items-center gap-3">
                    <Usb className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium">{device}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono border-emerald-500/30 text-emerald-500">Allowed</Badge>
                </div>
              ))}
              <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <div className="flex items-center gap-3">
                  <Usb className="w-4 h-4 text-destructive" />
                  <span className="text-xs font-medium">Generic Flash Drive</span>
                </div>
                <Badge variant="destructive" className="text-[10px] uppercase font-mono">Blocked</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-border/50 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">Security Modules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ModuleStatus label="Memory Injection Detection" active />
              <ModuleStatus label="Living-off-the-land Protection" active />
              <ModuleStatus label="Application Whitelisting" active />
              <ModuleStatus label="Registry Integrity Monitor" active />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ProcessItem({ name, cpu, memory, status, warning }: any) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-4 flex-1">
        <div className={cn(
          "p-2 rounded-lg",
          warning ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
        )}>
          {warning ? <AlertCircle className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{name}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[10px] font-mono text-muted-foreground">CPU: {cpu}</span>
            <span className="text-[10px] font-mono text-muted-foreground">MEM: {memory}</span>
          </div>
        </div>
      </div>
      <Badge variant="outline" className={cn(
        "font-mono text-[10px] uppercase tracking-widest",
        warning ? "border-destructive/50 text-destructive" : "border-primary/30 text-primary"
      )}>
        {status}
      </Badge>
    </div>
  );
}

function ModuleStatus({ label, active }: any) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className={cn(
        "w-2 h-2 rounded-full",
        active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-muted"
      )} />
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
