import React from 'react';
import { Bell, Search, ShieldCheck, Activity, Wifi } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrandLogo } from '@/components/brand/BrandLogo';

export function Header() {
  return (
    <header className="h-16 border-b border-border bg-card/30 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-50">
      <div className="flex items-center gap-6 flex-1">
        <div className="hidden 2xl:block shrink-0">
          <BrandLogo size="sm" subtitle="Threat Mesh" />
        </div>
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search security logs, assets, or threats..." 
            className="pl-10 bg-muted/30 border-none h-9 text-sm focus-visible:ring-1 focus-visible:ring-primary/50"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wider">System Secure</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
            <Activity className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">Agent Active</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 mr-4">
          <Wifi className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-mono text-muted-foreground">Sync: 12ms</span>
        </div>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-background"></span>
        </Button>
        <Badge variant="outline" className="font-mono text-[10px] py-0.5 px-2 border-primary/30 text-primary">
          v1.4.2-PRO
        </Badge>
      </div>
    </header>
  );
}
