import React from 'react';
import { 
  Shield, 
  AlertTriangle, 
  Zap, 
  TrendingUp, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { mockTelemetry, mockAlerts } from '@/lib/mockData';
import { BrandLogo } from '@/components/brand/BrandLogo';

const chartData = [
  { time: '00:00', threats: 12, traffic: 45 },
  { time: '04:00', threats: 8, traffic: 30 },
  { time: '08:00', threats: 25, traffic: 85 },
  { time: '12:00', threats: 15, traffic: 95 },
  { time: '16:00', threats: 42, traffic: 120 },
  { time: '20:00', threats: 20, traffic: 60 },
];

export function Overview() {
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div className="space-y-3">
          <BrandLogo size="sm" subtitle="Operations Dashboard" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Security Command</h2>
            <p className="text-muted-foreground mt-1">Threat correlation, telemetry fusion, and AI agent guardrails in one mission control layer.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="font-mono px-3 py-1">
            <Clock className="w-3 h-3 mr-2" />
            Last Sync: 2s ago
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Threat Level" 
          value="12" 
          subValue="/ 100" 
          status="Low" 
          icon={Shield} 
          trend="+2.4%" 
          trendUp={false}
          color="text-emerald-500"
        />
        <StatsCard 
          title="Active Threats" 
          value="3" 
          subValue="Identified" 
          status="Action Required" 
          icon={AlertTriangle} 
          trend="+1" 
          trendUp={true}
          color="text-amber-500"
        />
        <StatsCard 
          title="Network Traffic" 
          value="1.6" 
          subValue="GB/s" 
          status="Stable" 
          icon={Activity} 
          trend="-12%" 
          trendUp={false}
          color="text-primary"
        />
        <StatsCard 
          title="Agent Uptime" 
          value="99.9" 
          subValue="%" 
          status="Optimal" 
          icon={Zap} 
          trend="+0.01%" 
          trendUp={true}
          color="text-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Threat Intelligence Timeline</CardTitle>
              <CardDescription>Correlated signals across all endpoints</CardDescription>
            </div>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-5)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--chart-5)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="var(--muted-foreground)" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="var(--muted-foreground)" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="threats" 
                  stroke="var(--chart-5)" 
                  fillOpacity={1} 
                  fill="url(#colorThreats)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Alerts</CardTitle>
            <CardDescription>Critical security events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {mockAlerts.map((alert) => (
                <div key={alert.id} className="flex gap-4 group cursor-pointer">
                  <div className={cn(
                    "w-1 h-12 rounded-full",
                    alert.severity === 'High' ? 'bg-destructive' : 
                    alert.severity === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'
                  )} />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{alert.type}</span>
                      <span className="text-[10px] text-muted-foreground">{alert.timestamp.split(' ')[1]}</span>
                    </div>
                    <p className="text-sm font-medium leading-tight group-hover:text-primary transition-colors">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-6 text-xs font-mono uppercase tracking-widest">
              View All Logs
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ResourceCard title="CPU Load" value={mockTelemetry.endpoint.cpuUsage} progress={12} />
        <ResourceCard title="Memory" value="4.2 / 16 GB" progress={26} />
        <ResourceCard title="Storage" value="245 / 512 GB" progress={48} />
      </div>
    </div>
  );
}

function StatsCard({ title, value, subValue, status, icon: Icon, trend, trendUp, color }: any) {
  return (
    <Card className="bg-card/50 border-border/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 group">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-2 rounded-lg bg-muted/50 group-hover:bg-primary/10 transition-colors", color)}>
            <Icon className="w-5 h-5" />
          </div>
          <div className={cn(
            "flex items-center text-xs font-medium",
            trendUp ? "text-emerald-500" : "text-emerald-500" // Mocking all as good for now
          )}>
            {trendUp ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
            {trend}
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight">{value}</span>
            <span className="text-sm text-muted-foreground font-mono">{subValue}</span>
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">{title}</p>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", color.replace('text-', 'bg-'))} />
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{status}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ResourceCard({ title, value, progress }: any) {
  return (
    <Card className="bg-card/30 border-border/30">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">{title}</span>
          <span className="text-sm font-bold">{value}</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </CardContent>
    </Card>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
