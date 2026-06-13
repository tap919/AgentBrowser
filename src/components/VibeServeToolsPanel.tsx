'use client';

import { useState } from 'react';
import {
  Code2, TestTube, Wrench, ShieldCheck, Search,
  Brain, FileText, Workflow, Zap, Loader2,
  CheckCircle, XCircle, Copy, ChevronDown, ChevronRight,
} from 'lucide-react';
import { apiPost } from '@/lib/api-client';

interface ToolParam {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

interface CuratedTool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  params: ToolParam[];
}

type ToolResult = {
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: unknown;
  error?: string;
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Code Analysis': <Code2 className="w-4 h-4 text-cyan-400" />,
  'Memory': <Brain className="w-4 h-4 text-violet-400" />,
  'Planning': <FileText className="w-4 h-4 text-amber-400" />,
};

const CURATED_TOOLS: Record<string, CuratedTool[]> = {
  'Code Analysis': [
    {
      id: 'vs_codebase_analyze', name: 'Analyze Codebase', icon: <Search className="w-3.5 h-3.5" />,
      description: 'Analyze workspace for dependencies, circular deps, and type coverage',
      params: [{ name: 'path', label: 'Project Path', type: 'text', required: true, placeholder: './src' }],
    },
    {
      id: 'vs_code_review', name: 'Code Review', icon: <ShieldCheck className="w-3.5 h-3.5" />,
      description: 'Structured code review checking security and quality patterns',
      params: [
        { name: 'files', label: 'Files to Review', type: 'textarea', required: true, placeholder: 'src/app/page.tsx\nsrc/lib/service-hub.ts' },
        { name: 'context', label: 'Context (optional)', type: 'text', placeholder: 'e.g. authentication module' },
      ],
    },
    {
      id: 'vs_dependency_audit', name: 'Dependency Audit', icon: <Wrench className="w-3.5 h-3.5" />,
      description: 'Check outdated, security, and unused dependencies',
      params: [{ name: 'path', label: 'Project Path', type: 'text', required: true, placeholder: '.' }],
    },
    {
      id: 'vs_generate_tests', name: 'Generate Tests', icon: <TestTube className="w-3.5 h-3.5" />,
      description: 'Generate test scaffolding for files',
      params: [
        { name: 'path', label: 'File Path', type: 'text', required: true, placeholder: 'src/lib/service-hub.ts' },
        { name: 'framework', label: 'Test Framework', type: 'select', options: ['vitest', 'jest', 'pytest', 'go test'] },
      ],
    },
    {
      id: 'vs_refactor_symbol', name: 'Refactor Symbol', icon: <Zap className="w-3.5 h-3.5" />,
      description: 'Safely rename or extract a symbol across the workspace',
      params: [
        { name: 'symbol', label: 'Symbol Name', type: 'text', required: true, placeholder: 'oldFunctionName' },
        { name: 'newName', label: 'New Name', type: 'text', required: true, placeholder: 'newFunctionName' },
        { name: 'path', label: 'File Path (optional)', type: 'text', placeholder: 'src/lib/' },
      ],
    },
  ],
  'Memory': [
    {
      id: 'vs_memory_get', name: 'Get Memory', icon: <Brain className="w-3.5 h-3.5" />,
      description: 'Retrieve stored context or memory from VibeServe',
      params: [{ name: 'workspaceId', label: 'Workspace ID', type: 'text', required: true, placeholder: 'default' }],
    },
    {
      id: 'vs_memory_store', name: 'Store Memory', icon: <Workflow className="w-3.5 h-3.5" />,
      description: 'Store context or memory in VibeServe for later retrieval',
      params: [
        { name: 'workspaceId', label: 'Workspace ID', type: 'text', required: true, placeholder: 'default' },
        { name: 'content', label: 'Content', type: 'textarea', required: true, placeholder: 'Important context to remember...' },
      ],
    },
  ],
  'Planning': [
    {
      id: 'vs_plan_review', name: 'Review Plan', icon: <FileText className="w-3.5 h-3.5" />,
      description: 'Review a plan for risks, dependencies, and completeness',
      params: [{ name: 'plan', label: 'Plan Text', type: 'textarea', required: true, placeholder: 'Describe your plan...' }],
    },
    {
      id: 'vs_generate_artifact', name: 'Generate Artifact', icon: <Code2 className="w-3.5 h-3.5" />,
      description: 'Generate a structured artifact — component spec, code block, or JSON patch',
      params: [
        { name: 'type', label: 'Artifact Type', type: 'select', options: ['component_spec', 'code_block', 'json_patch'] },
        { name: 'description', label: 'Description', type: 'textarea', required: true, placeholder: 'Describe what to generate...' },
      ],
    },
  ],
};

function ResultView({ result: res }: { result: ToolResult }) {
  if (res.status === 'idle') return null;
  if (res.status === 'loading') {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-background/10 mt-3">
        <Loader2 className="w-4 h-4 text-primary animate-spin" />
        <span className="text-xs text-muted-foreground">Executing tool...</span>
      </div>
    );
  }

  const isError = res.status === 'error';
  return (
    <div className={`mt-3 p-3 rounded-xl border ${isError ? 'border-red-500/20 bg-red-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
      <div className="flex items-center gap-2 mb-2">
        {isError ? <XCircle className="w-4 h-4 text-red-400" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />}
        <span className={`text-xs font-bold ${isError ? 'text-red-400' : 'text-emerald-400'}`}>
          {isError ? 'Error' : 'Success'}
        </span>
        {!isError && (
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(JSON.stringify(res.data, null, 2))}
            className="ml-auto p-1 rounded hover:bg-background/20 text-muted-foreground transition-all"
            title="Copy result"
          >
            <Copy className="w-3 h-3" />
          </button>
        )}
      </div>
      <pre className="text-xs text-foreground/80 font-mono whitespace-pre-wrap overflow-x-auto max-h-60 overflow-y-auto">
        {isError ? res.error : JSON.stringify(res.data, null, 2)}
      </pre>
    </div>
  );
}

export default function VibeServeToolsPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [openTool, setOpenTool] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, Record<string, string>>>({});
  const [results, setResults] = useState<Record<string, ToolResult>>({});

  const handleParamChange = (toolId: string, paramName: string, value: string) => {
    setParams(prev => ({
      ...prev,
      [toolId]: { ...(prev[toolId] || {}), [paramName]: value },
    }));
  };

  const handleExecute = async (tool: CuratedTool) => {
    setResults(prev => ({ ...prev, [tool.id]: { status: 'loading' } }));

    const toolParams = params[tool.id] || {};
    try {
      const res = await apiPost('/api/services', { action: 'vibeserve-execute', tool: tool.id, params: toolParams });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResults(prev => ({ ...prev, [tool.id]: { status: 'success', data: data.result } }));
    } catch (err: unknown) {
      setResults(prev => ({
        ...prev,
        [tool.id]: { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' },
      }));
    }
  };

  return (
    <div className="rounded-2xl border border-border/30 bg-background/20">
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 w-full p-4 text-left"
      >
        {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        <Code2 className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-semibold text-foreground">VibeServe Tools</span>
        <span className="text-[10px] text-muted-foreground font-mono">
          {Object.values(CURATED_TOOLS).flat().length} tools
        </span>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-4">
          {Object.entries(CURATED_TOOLS).map(([category, tools]) => (
            <div key={category}>
              {/* Category Header */}
              <div className="flex items-center gap-2 mb-2">
                {CATEGORY_ICONS[category]}
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{category}</span>
              </div>

              {/* Tool Cards */}
              <div className="space-y-2">
                {tools.map(tool => (
                  <div key={tool.id} className="rounded-xl border border-border/20 bg-background/10">
                    {/* Tool Header (clickable) */}
                    <button
                      type="button"
                      onClick={() => setOpenTool(openTool === tool.id ? null : tool.id)}
                      className="flex items-center gap-2 w-full p-3 text-left"
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-background/20">
                        {tool.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-foreground">{tool.name}</span>
                        <p className="text-[10px] text-muted-foreground truncate">{tool.description}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {results[tool.id]?.status === 'loading' && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
                        {results[tool.id]?.status === 'success' && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                        {results[tool.id]?.status === 'error' && <XCircle className="w-3 h-3 text-red-400" />}
                        {openTool === tool.id ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                      </div>
                    </button>

                    {/* Expanded Body */}
                    {openTool === tool.id && (
                      <div className="px-3 pb-3 space-y-3">
                        {tool.params.map(p => (
                          <div key={p.name}>
                            <label className="block text-[10px] font-medium text-muted-foreground mb-1">
                              {p.label}
                              {p.required && <span className="text-red-400 ml-0.5">*</span>}
                            </label>
                            {p.type === 'select' ? (
                              <select
                                value={params[tool.id]?.[p.name] || (p.options?.[0] ?? '')}
                                onChange={(e) => handleParamChange(tool.id, p.name, e.target.value)}
                                className="w-full bg-background/20 border border-border/30 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                              >
                                {p.options?.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : p.type === 'textarea' ? (
                              <textarea
                                value={params[tool.id]?.[p.name] || ''}
                                onChange={(e) => handleParamChange(tool.id, p.name, e.target.value)}
                                placeholder={p.placeholder}
                                rows={3}
                                className="w-full bg-background/20 border border-border/30 rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none font-mono"
                              />
                            ) : (
                              <input
                                type="text"
                                value={params[tool.id]?.[p.name] || ''}
                                onChange={(e) => handleParamChange(tool.id, p.name, e.target.value)}
                                placeholder={p.placeholder}
                                className="w-full bg-background/20 border border-border/30 rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 font-mono"
                              />
                            )}
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => handleExecute(tool)}
                          disabled={results[tool.id]?.status === 'loading'}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-all disabled:opacity-50"
                        >
                          {results[tool.id]?.status === 'loading' ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Zap className="w-3 h-3" />
                          )}
                          Execute
                        </button>

                        <ResultView result={results[tool.id] || { status: 'idle' }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
