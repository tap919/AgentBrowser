import React from 'react';
import { 
  LayoutDashboard, 
  Laptop, 
  Network, 
  Database, 
  Fingerprint, 
  Brain, 
  Settings, 
  LogOut,
  Bell,
  Command,
  BarChart3,
  GitBranch,
  SearchCode,
  ShieldAlert,
  Workflow,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/components/auth/AuthProvider';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { BrandLogo } from '@/components/brand/BrandLogo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { user, userData } = useAuth();
  
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error", error);
    }
  };

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, section: 'main' },
    { id: 'command', label: 'Command Center', icon: Command, section: 'main' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, section: 'main' },
    { id: 'github', label: 'GitHub Scanner', icon: GitBranch, section: 'main' },
    { id: 'endpoint', label: 'Endpoint Protection', icon: Laptop, section: 'protection' },
    { id: 'network', label: 'Network Defense', icon: Network, section: 'protection' },
    { id: 'dlp', label: 'Data Protection', icon: Database, section: 'protection' },
    { id: 'identity', label: 'Identity & Access', icon: Fingerprint, section: 'protection' },
    { id: 'brain', label: 'AI Security Brain', icon: Brain, section: 'ai' },
    { id: 'threathunt', label: 'Threat Hunt / DFIR', icon: SearchCode, section: 'ai' },
    { id: 'vulnscanner', label: 'Vuln Scanner', icon: ShieldAlert, section: 'ai' },
    { id: 'playbooks', label: 'Playbooks & Compliance', icon: Workflow, section: 'ai' },
    { id: 'cyberwiki', label: 'Karpathy Cyber Wiki', icon: BookOpen, section: 'ai' },
  ];

  return (
    <div className="w-64 border-r border-border bg-card/50 backdrop-blur-xl flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-border/40 bg-gradient-to-b from-primary/10 to-transparent">
        <BrandLogo
          size="md"
          subtitle="AI Security Command"
          imageClassName="max-w-full"
        />
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 py-2">
          {/* Main Section */}
          <div className="space-y-1">
            <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
              Dashboard
            </p>
            {menuItems.filter(item => item.section === 'main').map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? 'secondary' : 'ghost'}
                className={cn(
                  "w-full justify-start gap-3 h-11 px-4 transition-all duration-200",
                  activeTab === item.id ? "bg-secondary shadow-sm" : "hover:bg-secondary/50"
                )}
                onClick={() => setActiveTab(item.id)}
              >
                <item.icon className={cn("w-4 h-4", activeTab === item.id ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-sm font-medium", activeTab === item.id ? "text-foreground" : "text-muted-foreground")}>
                  {item.label}
                </span>
              </Button>
            ))}
          </div>

          {/* Protection Section */}
          <div className="space-y-1">
            <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
              Protection
            </p>
            {menuItems.filter(item => item.section === 'protection').map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? 'secondary' : 'ghost'}
                className={cn(
                  "w-full justify-start gap-3 h-11 px-4 transition-all duration-200",
                  activeTab === item.id ? "bg-secondary shadow-sm" : "hover:bg-secondary/50"
                )}
                onClick={() => setActiveTab(item.id)}
              >
                <item.icon className={cn("w-4 h-4", activeTab === item.id ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-sm font-medium", activeTab === item.id ? "text-foreground" : "text-muted-foreground")}>
                  {item.label}
                </span>
              </Button>
            ))}
          </div>

          {/* AI Section */}
          <div className="space-y-1">
            <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
              AI Security
            </p>
            {menuItems.filter(item => item.section === 'ai').map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? 'secondary' : 'ghost'}
                className={cn(
                  "w-full justify-start gap-3 h-11 px-4 transition-all duration-200",
                  activeTab === item.id ? "bg-secondary shadow-sm" : "hover:bg-secondary/50"
                )}
                onClick={() => setActiveTab(item.id)}
              >
                <item.icon className={cn("w-4 h-4", activeTab === item.id ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-sm font-medium", activeTab === item.id ? "text-foreground" : "text-muted-foreground")}>
                  {item.label}
                </span>
              </Button>
            ))}
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 mt-auto">
        <Separator className="mb-4 opacity-50" />
        <div className="flex items-center gap-3 px-2 mb-4">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarImage src={user?.photoURL || `https://picsum.photos/seed/${user?.uid}/100/100`} />
            <AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.displayName || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate font-mono uppercase tracking-tighter">
              {userData?.role || 'Guest'} Console
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Sign Out</span>
        </Button>
      </div>
    </div>
  );
}
