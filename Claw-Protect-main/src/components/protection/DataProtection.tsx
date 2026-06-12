import React from 'react';
import { 
  Database, 
  ShieldCheck, 
  FileText, 
  Lock, 
  Eye, 
  Share2,
  AlertCircle,
  HardDrive,
  FileWarning
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { mockTelemetry } from '@/lib/mockData';

export function DataProtection() {
  const { dlp } = mockTelemetry;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
            <Database className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Data Loss Prevention</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="bg-amber-500/5 text-amber-500 border-amber-500/20">
                <Lock className="w-3 h-3 mr-1" />
                DLP Enforced
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">Policy: Enterprise Standard v2</span>
            </div>
          </div>
        </div>
        <Button className="gap-2">
          <FileText className="w-4 h-4" />
          Classification Report
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card/40 border-border/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg">Data Classification Engine</CardTitle>
            <CardDescription>Automated labeling of sensitive business assets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ClassificationItem label="Personally Identifiable Info (PII)" count={420} color="bg-blue-500" progress={30} />
              <ClassificationItem label="Financial Records" count={125} color="bg-emerald-500" progress={15} />
              <ClassificationItem label="Proprietary IP / Source Code" count={840} color="bg-primary" progress={65} />
              <ClassificationItem label="Unclassified / Public" count={35} color="bg-muted" progress={5} />
            </div>
            
            <Separator className="my-8 opacity-50" />
            
            <div className="space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent File Activity</h4>
              <div className="space-y-3">
                <FileActivityItem name="Q1_Financial_Report.pdf" type="Financial" action="Encrypted" time="2m ago" />
                <FileActivityItem name="Customer_Database_Export.csv" type="PII" action="Blocked Upload" time="15m ago" warning />
                <FileActivityItem name="Project_Claw_Specs.docx" type="IP" action="Classified" time="1h ago" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-card/40 border-border/50 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">Exfiltration Prevention</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-muted/30 border border-border/20 text-center">
                <p className="text-3xl font-bold">0</p>
                <p className="text-[10px] text-muted-foreground uppercase font-mono mt-1">Leaks Prevented (24h)</p>
              </div>
              <div className="space-y-3">
                <ModuleStatus label="Cloud Upload Monitoring" active />
                <ModuleStatus label="USB Data Transfer Block" active />
                <ModuleStatus label="Clipboard / Screenshot Guard" active />
                <ModuleStatus label="Email Attachment Inspection" active />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-border/50 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">Storage Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium">Encrypted Volume</span>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">Healthy</Badge>
              </div>
              <Progress value={48} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground font-mono">245.2 GB / 512.0 GB used</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ClassificationItem({ label, count, color, progress }: any) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-xs font-mono font-bold">{count}</span>
      </div>
      <Progress value={progress} className="h-1.5" />
    </div>
  );
}

function FileActivityItem({ name, type, action, time, warning }: any) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          warning ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
        )}>
          {warning ? <FileWarning className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
        </div>
        <div>
          <p className="text-sm font-medium">{name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 uppercase font-mono">{type}</Badge>
            <span className="text-[10px] text-muted-foreground">{time}</span>
          </div>
        </div>
      </div>
      <span className={cn(
        "text-[10px] font-mono uppercase tracking-widest font-bold",
        warning ? "text-destructive" : "text-primary"
      )}>{action}</span>
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
