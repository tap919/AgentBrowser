'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileJson, FileCode, AlertCircle, CheckCircle, FolderOpen, Files, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { type CustomAgent } from '@/features/agents/types';

interface AgentUploadModalProps {
  onUpload: (agents: CustomAgent[]) => void;
  onClose: () => void;
}

interface AgentFile {
  name: string;
  type: 'config' | 'code';
  content: string;
  securityTier: 'full' | 'reduced' | 'custom';
}

export default function AgentUploadModal({ onUpload, onClose }: AgentUploadModalProps) {
  const [agentFiles, setAgentFiles] = useState<AgentFile[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const folderInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (files: FileList) => {
    setIsProcessing(true);
    setError('');
    const processed: AgentFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const path = file.webkitRelativePath || file.name;
      
      // Skip directories
      if (file.type === '' && !file.name.includes('.')) continue;

      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      // Determine agent type
      let agentType: 'config' | 'code' = 'config';
      if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
        agentType = 'code';
      } else if (ext !== '.json') {
        continue; // Skip non-agent files
      }

      try {
        const content = await file.text();
        let parsedConfig: object | undefined;

        if (agentType === 'config') {
          try {
            parsedConfig = JSON.parse(content);
          } catch {
            continue; // Skip invalid JSON
          }
        }

        processed.push({
          name: path.split('/').pop()?.replace(/\.[^.]+$/, '') || file.name,
          type: agentType,
          content: agentType === 'config' ? JSON.stringify(parsedConfig) : content,
          securityTier: 'reduced' as const,
        });
      } catch {
        console.warn(`Failed to read file: ${file.name}`);
      }
    }

    setAgentFiles(prev => [...prev, ...processed]);
    
    // Auto-select all new agents
    const startIdx = selectedAgents.size;
    const newSelection = new Set(selectedAgents);
    for (let i = 0; i < processed.length; i++) {
      newSelection.add(startIdx + i);
    }
    setSelectedAgents(newSelection);
    
    setIsProcessing(false);
    
    if (processed.length === 0) {
      setError('No valid agent files found in the selected folder');
    } else {
      toast.success(`Found ${processed.length} agent file(s)`);
    }
  }, [selectedAgents, setSelectedAgents]);

  const handleFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(files);
  };

  const toggleSelection = (index: number) => {
    const newSelection = new Set(selectedAgents);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedAgents(newSelection);
  };

  const removeAgent = (index: number) => {
    setAgentFiles(prev => prev.filter((_, i) => i !== index));
    setSelectedAgents(prev => {
      const newSelection = new Set<number>();
      prev.forEach(i => {
        if (i < index) newSelection.add(i);
        else if (i > index) newSelection.add(i - 1);
      });
      return newSelection;
    });
  };

  const handleUpload = () => {
    if (selectedAgents.size === 0) {
      setError('Please select at least one agent to upload');
      return;
    }

    const agents: CustomAgent[] = agentFiles
      .filter((_, idx) => selectedAgents.has(idx))
      .map(file => ({
        id: crypto.randomUUID(),
        name: file.name,
        description: `Agent loaded from folder upload`,
        type: file.type,
        config: file.type === 'config' ? JSON.parse(file.content) : undefined,
        code: file.type === 'code' ? file.content : undefined,
        securityTier: file.securityTier,
        enabled: true,
        addedAt: new Date().toISOString(),
      }));

    onUpload(agents);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg p-6 rounded-2xl bg-background border border-border/30 shadow-xl max-h-[80vh] flex flex-col">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-background/20 text-muted-foreground transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Upload Agents</h2>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Folder upload */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Upload Agent Folder</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-border/40 bg-background/20 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all"
              >
                <FolderOpen className="w-4 h-4" />
                Select Folder
              </button>
<input
              ref={folderInputRef}
              type="file"
              // @ts-expect-error - webkitdirectory is a non-standard but widely supported attribute
              webkitdirectory=""
              multiple
              onChange={handleFolderChange}
              className="hidden"
            />
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Select a folder containing agent config (.json) or code (.js/.ts) files
            </p>
          </div>

          {isProcessing && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-primary text-xs">
              <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Processing files...
            </div>
          )}

          {/* Agent list */}
          {agentFiles.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-foreground">Loaded Agents ({selectedAgents.size} selected)</span>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedAgents.size === agentFiles.length) {
                      setSelectedAgents(new Set());
                    } else {
                      setSelectedAgents(new Set(agentFiles.map((_, i) => i)));
                    }
                  }}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                >
                  {selectedAgents.size === agentFiles.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {agentFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                      selectedAgents.has(idx)
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border/30 bg-background/20'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSelection(idx)}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                        selectedAgents.has(idx)
                          ? 'bg-primary border-primary'
                          : 'border-border/40 hover:border-primary/40'
                      }`}
                    >
                      {selectedAgents.has(idx) && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                    </button>
                    {file.type === 'config' ? (
                      <FileJson className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <FileCode className="w-4 h-4 text-purple-400" />
                    )}
                    <span className="flex-1 text-xs text-foreground truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAgent(idx)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleUpload}
          disabled={selectedAgents.size === 0}
          className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Files className="w-4 h-4" />
          Upload {selectedAgents.size} Agent{selectedAgents.size !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );
}