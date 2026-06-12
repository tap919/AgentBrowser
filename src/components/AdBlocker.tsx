'use client';

import { useState, useEffect } from 'react';
import { Shield, ShieldOff, Eye, EyeOff, Loader2 } from 'lucide-react';
import { FiltersEngine, makeRequest } from '@ghostery/adblocker';

export default function AdBlocker() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [blocker, setBlocker] = useState<FiltersEngine | null>(null);
  const [stats, setStats] = useState({ blocked: 0, allowed: 0 });
  const [showBlocked, setShowBlocked] = useState(false);

  // Load blocker on mount
  useEffect(() => {
    async function initBlocker() {
      setIsLoading(true);
      try {
        const b = await FiltersEngine.fromPrebuiltAdsAndTracking(fetch);
        setBlocker(b);
        
        // Load persisted stats
        const saved = localStorage.getItem('ab_adblocker_stats');
        if (saved) {
          setStats(JSON.parse(saved));
        }
      } catch (err) {
        console.error('Failed to initialize ad blocker:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    initBlocker();
  }, []);

  // Save stats when they change
  useEffect(() => {
    if (blocker) {
      localStorage.setItem('ab_adblocker_stats', JSON.stringify(stats));
    }
  }, [stats, blocker]);

  const toggleEnabled = () => {
    setIsEnabled(!isEnabled);
  };

  const clearStats = () => {
    setStats({ blocked: 0, allowed: 0 });
    localStorage.removeItem('ab_adblocker_stats');
  };

  // Export blocker for use in other components
  useEffect(() => {
    if (blocker) {
      (window as any).__adBlocker = blocker;
      (window as any).__adBlockerEnabled = isEnabled;
    }
  }, [blocker, isEnabled]);

  // Quick filter presets
  const filterPresets = [
    { id: 'ads', label: 'Ads', enabled: true },
    { id: 'trackers', label: 'Trackers', enabled: true },
    { id: 'annoyances', label: 'Annoyances', enabled: false },
    { id: 'social', label: 'Social Widgets', enabled: true },
  ];

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isEnabled ? (
            <Shield className="w-5 h-5 text-emerald-400" />
          ) : (
            <ShieldOff className="w-5 h-5 text-muted-foreground" />
          )}
          <span className="text-sm font-semibold text-foreground">Ad & Tracker Blocker</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleEnabled}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isEnabled 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-muted/20 text-muted-foreground border border-border/30'
            }`}
          >
            {isEnabled ? 'Enabled' : 'Disabled'}
          </button>
          
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Loading filter lists...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-border/30 bg-background/20 text-center">
              <p className="text-lg font-bold text-red-400">{stats.blocked}</p>
              <p className="text-[10px] text-muted-foreground">Blocked</p>
            </div>
            <div className="p-3 rounded-xl border border-border/30 bg-background/20 text-center">
              <p className="text-lg font-bold text-emerald-400">{stats.allowed}</p>
              <p className="text-[10px] text-muted-foreground">Allowed</p>
            </div>
          </div>

          {/* Filter Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Filter Lists</span>
              <button
                onClick={clearStats}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                Reset Stats
              </button>
            </div>
            
            <div className="space-y-1">
              {filterPresets.map(preset => (
                <div
                  key={preset.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-background/10 border border-border/20"
                >
                  <span className="text-xs text-foreground">{preset.label}</span>
                  <div className={`w-4 h-4 rounded flex items-center justify-center ${
                    preset.enabled 
                      ? 'bg-primary' 
                      : 'bg-muted border border-border/30'
                  }`}>
                    {preset.enabled && <Eye className="w-2.5 h-2.5 text-primary-foreground" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <p className="text-[10px] text-blue-400/80 leading-relaxed">
              Using EasyList & EasyPrivacy filter rules. Blocks ads, trackers, and annoyances across all browse sessions.
            </p>
          </div>

          {/* Blocked requests preview (toggle) */}
          <div>
            <button
              onClick={() => setShowBlocked(!showBlocked)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
            >
              {showBlocked ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showBlocked ? 'Hide' : 'Show'} blocked domains
            </button>
            
            {showBlocked && stats.blocked > 0 && (
              <div className="mt-2 p-2 rounded-lg bg-background/10 text-[10px] text-muted-foreground max-h-32 overflow-y-auto">
                <p className="italic">Blocked requests logged here...</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Utility function to check if a URL should be blocked
export function isBlocked(url: string): boolean {
  const blocker = (window as any).__adBlocker as FiltersEngine | undefined;
  const enabled = (window as any).__adBlockerEnabled as boolean | undefined;
  
  if (!blocker || enabled === false) return false;
  
  return blocker.match(makeRequest({
    url,
    sourceUrl: url,
    type: 'document',
  })).match;
}
