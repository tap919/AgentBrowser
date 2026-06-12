// Canonical CustomAgent type — merged from src/types/agent.ts and src/lib/settings.ts
export interface CustomAgent {
  id: string;
  name: string;
  description?: string;
  type: 'config' | 'code';
  /** Base64 content or URL to agent config file (settings.ts variant) */
  config?: string;
  /** Config object (agents/types.ts variant) */
  configObj?: object;
  code?: string;
  fileName?: string;
  securityTier: 'full' | 'reduced' | 'custom';
  enabled: boolean;
  addedAt: string;
}
