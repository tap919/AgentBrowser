import React from 'react';
import { 
  Fingerprint, 
  ShieldCheck, 
  Key, 
  UserCheck, 
  MapPin, 
  Clock,
  AlertTriangle,
  ShieldAlert,
  Smartphone,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { mockTelemetry } from '@/lib/mockData';

export function IdentityAccess() {
  const { identity } = mockTelemetry;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20">
            <Fingerprint className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Identity & Access</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="bg-purple-500/5 text-purple-500 border-purple-500/20">
                <UserCheck className="w-3 h-3 mr-1" />
                MFA Enforced
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">Method: FIDO2 Hardware Key</span>
            </div>
          </div>
        </div>
        <Button className="gap-2">
          <Key className="w-4 h-4" />
          Manage Tokens
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card/40 border-border/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg">Active Sessions</CardTitle>
            <CardDescription>Real-time monitoring of authenticated access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <SessionItem 
                device="MacBook Pro 16-inch" 
                location="San Francisco, CA" 
                ip="192.168.1.12" 
                time="Active Now" 
                current 
              />
              <SessionItem 
                device="iPhone 15 Pro" 
                location="San Francisco, CA" 
                ip="172.20.10.4" 
                time="2h ago" 
              />
              <SessionItem 
                device="Windows Workstation" 
                location="London, UK" 
                ip="82.45.12.104" 
                time="Yesterday" 
                warning
              />
            </div>
            
            <Separator className="my-8 opacity-50" />
            
            <div className="space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Privileged Access Management (PAM)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/30 border border-border/20">
                  <div className="flex items-center gap-3 mb-2">
                    <ShieldAlert className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold">Just-In-Time Access</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">Temporary admin privileges can be requested for specific tasks. Current status: <span className="text-emerald-500 font-bold">Revoked</span></p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/20">
                  <div className="flex items-center gap-3 mb-2">
                    <Smartphone className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold">MFA Fatigue Guard</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">Agent automatically blocks repeated MFA requests from anomalous locations. Status: <span className="text-emerald-500 font-bold">Monitoring</span></p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-card/40 border-border/50 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">Identity Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center text-center p-4">
                <Avatar className="h-20 w-20 border-2 border-primary/20 mb-4">
                  <AvatarImage src="https://picsum.photos/seed/user/200/200" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <h3 className="text-lg font-bold">John Doe</h3>
                <p className="text-xs text-muted-foreground font-mono">ncsound919@gmail.com</p>
                <Badge className="mt-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">Enterprise Admin</Badge>
              </div>
              <div className="space-y-3">
                <ModuleStatus label="Passwordless Auth" active />
                <ModuleStatus label="Biometric Verification" active />
                <ModuleStatus label="Token Rotation" active />
                <ModuleStatus label="Anomalous Login Block" active />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-border/50 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">Security Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-bold">98</span>
                <span className="text-xs text-muted-foreground font-mono">/ 100</span>
              </div>
              <Progress value={98} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground mt-2">Excellent. Identity posture is within enterprise compliance.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SessionItem({ device, location, ip, time, current, warning }: any) {
  return (
    <div className={cn(
      "flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
      current ? "bg-primary/5 border-primary/30" : "bg-muted/20 border-border/30",
      warning && "bg-destructive/5 border-destructive/30"
    )}>
      <div className="flex items-center gap-4">
        <div className={cn(
          "p-2 rounded-lg",
          current ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground",
          warning && "bg-destructive/10 text-destructive"
        )}>
          {warning ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{device}</p>
            {current && <Badge variant="secondary" className="text-[9px] h-4 px-1.5 uppercase font-mono">Current</Badge>}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <MapPin className="w-3 h-3" />
              {location}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
              <Activity className="w-3 h-3" />
              {ip}
            </div>
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground justify-end">
          <Clock className="w-3 h-3" />
          {time}
        </div>
        {warning && <Button variant="link" className="h-auto p-0 text-[10px] text-destructive font-bold uppercase tracking-widest mt-1">Revoke Access</Button>}
      </div>
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
