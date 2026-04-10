'use client';

import { useState } from 'react';
import { AppIcon } from '@/lib/icons';

export interface ProjectData {
  name: string;
  description: string;
  type: string;
  audience: string;
  services: string[];
  template: string;
}

interface ProjectFormProps {
  onSubmit: (data: ProjectData) => void;
  isAnalyzing: boolean;
}

const TEMPLATES = [
  { id: 'blank', name: 'Blank Project', icon: 'file', desc: 'Start from scratch' },
  { id: 'saas', name: 'SaaS Starter', icon: 'cloud', desc: 'Multi-tenant app with billing' },
  { id: 'ecommerce', name: 'E-Commerce', icon: 'shopping-cart', desc: 'Online store with payments' },
  { id: 'dashboard', name: 'Dashboard', icon: 'trending-up', desc: 'Analytics & monitoring' },
  { id: 'blog', name: 'Blog Platform', icon: 'pen-line', desc: 'Content management system' },
  { id: 'api', name: 'API Backend', icon: 'server', desc: 'REST/GraphQL API service' },
];

const PROJECT_TYPES = [
  'Web Application',
  'Mobile App',
  'Desktop App',
  'API / Microservice',
  'CLI Tool',
  'Browser Extension',
  'Library / SDK',
];

const SERVICES = [
  'Authentication',
  'Database',
  'File Storage',
  'Email',
  'Payments',
  'Search',
  'Real-time',
  'Analytics',
  'Notifications',
  'Caching',
];

export default function ProjectForm({ onSubmit, isAnalyzing }: ProjectFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('Web Application');
  const [audience, setAudience] = useState('');
  const [services, setServices] = useState<string[]>(['Authentication', 'Database']);
  const [template, setTemplate] = useState('blank');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const toggleService = (service: string) => {
    setServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) return;
    onSubmit({ name, description, type, audience, services, template });
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in-up">
      <div className="glass-strong rounded-2xl p-6 sm:p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Create New Project
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Define your project and let AI build it autonomously
          </p>
        </div>

        {/* Template Selection */}
        <div className="mb-6">
          <label className="text-sm font-medium text-foreground mb-3 block">
            <AppIcon name="layers" className="inline-block w-3.5 h-3.5 mr-1.5 text-primary" />
            Project Template
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTemplate(t.id);
                  if (t.id === 'saas') {
                    setServices(['Authentication', 'Database', 'Payments', 'Email']);
                    setType('Web Application');
                  } else if (t.id === 'ecommerce') {
                    setServices(['Database', 'Payments', 'File Storage', 'Search']);
                    setType('Web Application');
                  } else if (t.id === 'dashboard') {
                    setServices(['Authentication', 'Database', 'Analytics', 'Real-time']);
                    setType('Web Application');
                  } else if (t.id === 'blog') {
                    setServices(['Database', 'File Storage', 'Search', 'Notifications']);
                    setType('Web Application');
                  } else if (t.id === 'api') {
                    setServices(['Authentication', 'Database', 'Caching']);
                    setType('API / Microservice');
                  }
                }}
                className={`p-3 rounded-xl border text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                  template === t.id
                    ? 'border-primary/50 bg-primary/10 shadow-sm glow-purple'
                    : 'border-border/50 bg-background/30 hover:border-primary/30 hover:bg-primary/5'
                }`}
              >
                <AppIcon name={t.icon} className="w-5 h-5 text-primary mb-1.5" />
                <p className="text-sm font-medium text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Name */}
          <div>
            <label htmlFor="project-name" className="text-sm font-medium text-foreground mb-1.5 block">
              <AppIcon name="pen-line" className="inline-block w-3.5 h-3.5 mr-1.5 text-primary" />
              Project Name
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Project"
              className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-background/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-200 text-sm"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="project-desc" className="text-sm font-medium text-foreground mb-1.5 block">
              <AppIcon name="align-left" className="inline-block w-3.5 h-3.5 mr-1.5 text-primary" />
              Description
            </label>
            <textarea
              id="project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what your project does, its main features, and goals..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-background/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-200 text-sm resize-none"
              required
            />
          </div>

          {/* Project Type & Audience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="project-type" className="text-sm font-medium text-foreground mb-1.5 block">
                <AppIcon name="layers" className="inline-block w-3.5 h-3.5 mr-1.5 text-primary" />
                Project Type
              </label>
              <select
                id="project-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-background/50 text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-200 text-sm"
              >
                {PROJECT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="project-audience" className="text-sm font-medium text-foreground mb-1.5 block">
                <AppIcon name="users" className="inline-block w-3.5 h-3.5 mr-1.5 text-primary" />
                Target Audience
              </label>
              <input
                id="project-audience"
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="e.g., developers, small businesses"
                className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-background/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-200 text-sm"
              />
            </div>
          </div>

          {/* Services - Collapsible */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors mb-2"
            >
              <AppIcon name="chevron-right" className={`w-3 h-3 transition-transform duration-200 ${showAdvanced ? 'rotate-90' : ''}`} />
              <AppIcon name="puzzle" className="w-3.5 h-3.5 text-primary" />
              Services & Integrations
              <span className="text-xs text-muted-foreground">({services.length} selected)</span>
            </button>
            {showAdvanced && (
              <div className="flex flex-wrap gap-2 animate-fade-in-up">
                {SERVICES.map((service) => (
                  <button
                    key={service}
                    type="button"
                    onClick={() => toggleService(service)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
                      services.includes(service)
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'bg-muted/50 text-muted-foreground border border-border/50 hover:border-primary/20 hover:text-foreground'
                    }`}
                  >
                    {service}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!name.trim() || !description.trim() || isAnalyzing}
            className="w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{
              background: 'linear-gradient(135deg, oklch(0.55 0.22 280), oklch(0.6 0.2 190), oklch(0.55 0.18 160))',
              color: 'white',
            }}
          >
            {isAnalyzing ? (
              <span className="flex items-center justify-center gap-2">
                <AppIcon name="loader" className="w-4 h-4 animate-spin" />
                AI is analyzing your project...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <AppIcon name="rocket" className="w-4 h-4" />
                Launch Project Build
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
