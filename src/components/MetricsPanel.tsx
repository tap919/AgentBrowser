'use client';

import { useEffect, useState } from 'react';

export interface Metrics {
  linesOfCode: number;
  filesCreated: number;
  testsPassing: number;
  securityScore: number;
}

interface MetricsPanelProps {
  metrics: Metrics;
  isRunning: boolean;
}

function AnimatedCounter({ value, label, icon, color, suffix = '' }: {
  value: number;
  label: string;
  icon: string;
  color: string;
  suffix?: string;
}) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (displayValue === value) return;
    const diff = value - displayValue;
    const step = Math.ceil(Math.abs(diff) / 15) * Math.sign(diff);
    const timer = setInterval(() => {
      setDisplayValue(prev => {
        const next = prev + step;
        if ((step > 0 && next >= value) || (step < 0 && next <= value)) {
          clearInterval(timer);
          return value;
        }
        return next;
      });
    }, 30);
    return () => clearInterval(timer);
  }, [value, displayValue]);

  return (
    <div className="relative group">
      <div className={`p-3 sm:p-4 rounded-xl border border-border/30 bg-background/30 transition-all duration-300 hover:border-${color}/30 hover:bg-${color}/5`}>
        <div className="flex items-center gap-2 mb-2">
          <i className={`fa-solid ${icon} text-xs ${color === 'purple' ? 'text-purple-400' : color === 'cyan' ? 'text-cyan-400' : color === 'emerald' ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
        </div>
        <div className="text-lg sm:text-2xl font-bold font-mono">
          <span className={color === 'purple' ? 'text-purple-400' : color === 'cyan' ? 'text-cyan-400' : color === 'emerald' ? 'text-emerald-400' : 'text-amber-400'}>
            {displayValue.toLocaleString()}{suffix}
          </span>
        </div>
      </div>
    </div>
  );
}

function SecurityGauge({ score }: { score: number }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const color = score >= 90 ? 'text-emerald-400' : score >= 70 ? 'text-amber-400' : 'text-red-400';
  const strokeColor = score >= 90 ? '#34d399' : score >= 70 ? '#fbbf24' : '#f87171';

  return (
    <div className="p-3 sm:p-4 rounded-xl border border-border/30 bg-background/30 transition-all duration-300 hover:border-amber-500/30 hover:bg-amber-500/5">
      <div className="flex items-center gap-2 mb-2">
        <i className="fa-solid fa-shield-halved text-xs text-amber-400" />
        <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">Security</span>
      </div>
      <div className="flex items-center justify-center">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle
            cx="40" cy="40" r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            className="text-muted/20"
          />
          <circle
            cx="40" cy="40" r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 40 40)"
            className="transition-all duration-1000 ease-out"
          />
          <text x="40" y="40" textAnchor="middle" dominantBaseline="central" className={`text-sm font-bold ${color}`} fill="currentColor">
            {animatedScore}
          </text>
        </svg>
      </div>
    </div>
  );
}

export default function MetricsPanel({ metrics, isRunning }: MetricsPanelProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
      <AnimatedCounter
        value={metrics.linesOfCode}
        label="Lines of Code"
        icon="fa-code"
        color="purple"
      />
      <AnimatedCounter
        value={metrics.filesCreated}
        label="Files Created"
        icon="fa-file-code"
        color="cyan"
      />
      <AnimatedCounter
        value={metrics.testsPassing}
        label="Tests Passing"
        icon="fa-flask-vial"
        color="emerald"
        suffix={`/${Math.max(metrics.testsPassing + 3, 12)}`}
      />
      <SecurityGauge score={metrics.securityScore} />
      <div className="col-span-2 sm:col-span-1">
        <div className="p-3 sm:p-4 rounded-xl border border-border/30 bg-background/30 h-full flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <i className={`fa-solid ${isRunning ? 'fa-bolt text-yellow-400 animate-pulse' : 'fa-check-double text-emerald-400'}`} />
            <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">Status</span>
          </div>
          <span className={`text-sm font-bold ${isRunning ? 'text-yellow-400' : 'text-emerald-400'}`}>
            {isRunning ? 'Building...' : metrics.linesOfCode > 0 ? 'Complete' : 'Ready'}
          </span>
        </div>
      </div>
    </div>
  );
}
