/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// GitHub Scanner Service - Scans awesome-cybersecurity and trending repos

export interface GitHubRepo {
  name: string;
  fullName: string;
  description: string;
  stars: number;
  url: string;
  topics: string[];
  lastUpdated: string;
  language: string;
  relevanceScore: number;
}

export interface SecurityTool {
  repo: GitHubRepo;
  category: string;
  integration_difficulty: 'easy' | 'medium' | 'hard';
  recommended: boolean;
  reason: string;
}

export interface ScanResult {
  timestamp: Date;
  awesomeList: SecurityTool[];
  trending: GitHubRepo[];
  recommendations: SecurityTool[];
}

class GitHubScanner {
  private lastScan: ScanResult | null = null;
  private scanHistory: ScanResult[] = [];

  // Categories relevant to Claw Protect
  private relevantCategories = [
    'ai-security',
    'llm-security',
    'prompt-injection',
    'agent-security',
    'api-security',
    'secrets-scanning',
    'threat-detection',
    'monitoring',
    'compliance',
    'identity',
  ];

  /**
   * Scan GitHub Awesome Cybersecurity list
   * In production, this would use GitHub API
   */
  async scanAwesomeCybersecurity(): Promise<SecurityTool[]> {
    // Mock data - in production, would fetch from:
    // https://github.com/fabacab/awesome-cybersecurity-blueteam
    // https://github.com/guardrailsio/awesome-ai-security
    // https://github.com/f/awesome-chatgpt-prompts (for injection patterns)
    
    const mockTools: SecurityTool[] = [
      {
        repo: {
          name: 'owasp-llm-top-10',
          fullName: 'OWASP/www-project-top-10-for-large-language-model-applications',
          description: 'OWASP Top 10 for LLM Applications - security guidelines',
          stars: 3450,
          url: 'https://github.com/OWASP/www-project-top-10-for-large-language-model-applications',
          topics: ['llm', 'security', 'owasp', 'ai-security'],
          lastUpdated: '2026-04-10',
          language: 'Markdown',
          relevanceScore: 98,
        },
        category: 'ai-security',
        integration_difficulty: 'easy',
        recommended: true,
        reason: 'Core LLM security framework - can enhance prompt injection detection',
      },
      {
        repo: {
          name: 'garak',
          fullName: 'leondz/garak',
          description: 'LLM vulnerability scanner - tests for jailbreaks, prompt injection, hallucinations',
          stars: 2100,
          url: 'https://github.com/leondz/garak',
          topics: ['llm', 'testing', 'security', 'vulnerability-scanner'],
          lastUpdated: '2026-04-08',
          language: 'Python',
          relevanceScore: 95,
        },
        category: 'threat-detection',
        integration_difficulty: 'medium',
        recommended: true,
        reason: 'Can integrate test patterns into promptInjectionDetector',
      },
      {
        repo: {
          name: 'trufflehog',
          fullName: 'trufflesecurity/trufflehog',
          description: 'Find and verify credentials in code, configs, git repos',
          stars: 12500,
          url: 'https://github.com/trufflesecurity/trufflehog',
          topics: ['security', 'secrets-scanning', 'credentials'],
          lastUpdated: '2026-04-11',
          language: 'Go',
          relevanceScore: 92,
        },
        category: 'secrets-scanning',
        integration_difficulty: 'easy',
        recommended: true,
        reason: 'Enhanced secret patterns for secretsScanner module',
      },
      {
        repo: {
          name: 'falco',
          fullName: 'falcosecurity/falco',
          description: 'Cloud Native Runtime Security - behavioral activity monitoring',
          stars: 6800,
          url: 'https://github.com/falcosecurity/falco',
          topics: ['security', 'runtime', 'monitoring', 'threat-detection'],
          lastUpdated: '2026-04-09',
          language: 'C++',
          relevanceScore: 88,
        },
        category: 'monitoring',
        integration_difficulty: 'hard',
        recommended: false,
        reason: 'Advanced behavioral monitoring patterns - inspiration for agentMonitor',
      },
      {
        repo: {
          name: 'semgrep',
          fullName: 'returntocorp/semgrep',
          description: 'Lightweight static analysis for many languages - find bugs and enforce code standards',
          stars: 9200,
          url: 'https://github.com/returntocorp/semgrep',
          topics: ['security', 'static-analysis', 'linting'],
          lastUpdated: '2026-04-10',
          language: 'Python',
          relevanceScore: 85,
        },
        category: 'threat-detection',
        integration_difficulty: 'medium',
        recommended: false,
        reason: 'Code pattern matching techniques could enhance security rule engine',
      },
      {
        repo: {
          name: 'osquery',
          fullName: 'osquery/osquery',
          description: 'SQL powered operating system instrumentation and monitoring',
          stars: 20500,
          url: 'https://github.com/osquery/osquery',
          topics: ['monitoring', 'security', 'osquery', 'endpoint'],
          lastUpdated: '2026-04-07',
          language: 'C++',
          relevanceScore: 82,
        },
        category: 'monitoring',
        integration_difficulty: 'hard',
        recommended: false,
        reason: 'Endpoint monitoring inspiration - advanced telemetry collection',
      },
    ];

    return mockTools;
  }

  /**
   * Scan GitHub trending repositories for security tools
   */
  async scanTrending(): Promise<GitHubRepo[]> {
    // Mock trending repos - in production, would fetch from GitHub Trending API
    const mockTrending: GitHubRepo[] = [
      {
        name: 'ai-guardian',
        fullName: 'openai/ai-guardian',
        description: 'Real-time AI model output validation and safety monitoring',
        stars: 1850,
        url: 'https://github.com/openai/ai-guardian',
        topics: ['ai', 'safety', 'monitoring', 'llm'],
        lastUpdated: '2026-04-11',
        language: 'Python',
        relevanceScore: 90,
      },
      {
        name: 'agent-firewall',
        fullName: 'anthropic/agent-firewall',
        description: 'Network-level protection for AI agents - blocks malicious tool calls',
        stars: 920,
        url: 'https://github.com/anthropic/agent-firewall',
        topics: ['ai-agents', 'security', 'firewall'],
        lastUpdated: '2026-04-10',
        language: 'Rust',
        relevanceScore: 94,
      },
      {
        name: 'prompt-armor',
        fullName: 'security/prompt-armor',
        description: 'Advanced prompt injection detection with ML-based classification',
        stars: 650,
        url: 'https://github.com/security/prompt-armor',
        topics: ['prompt-injection', 'ml', 'security'],
        lastUpdated: '2026-04-09',
        language: 'Python',
        relevanceScore: 96,
      },
    ];

    return mockTrending;
  }

  /**
   * Generate integration recommendations based on current Claw Protect modules
   */
  async generateRecommendations(): Promise<SecurityTool[]> {
    const awesomeTools = await this.scanAwesomeCybersecurity();
    const trending = await this.scanTrending();

    // Convert trending to SecurityTool format
    const trendingTools: SecurityTool[] = trending.map(repo => ({
      repo,
      category: this.categorizeRepo(repo),
      integration_difficulty: 'medium' as const,
      recommended: repo.relevanceScore > 90,
      reason: `Trending tool with ${repo.stars} stars - ${repo.description}`,
    }));

    // Combine and filter
    const allTools = [...awesomeTools, ...trendingTools];
    const recommended = allTools
      .filter(tool => tool.recommended || tool.repo.relevanceScore > 85)
      .sort((a, b) => b.repo.relevanceScore - a.repo.relevanceScore);

    return recommended;
  }

  /**
   * Categorize repository based on topics and description
   */
  private categorizeRepo(repo: GitHubRepo): string {
    const text = `${repo.description} ${repo.topics.join(' ')}`.toLowerCase();

    if (text.includes('prompt') || text.includes('injection')) return 'prompt-injection';
    if (text.includes('agent') || text.includes('llm')) return 'ai-security';
    if (text.includes('secret') || text.includes('credential')) return 'secrets-scanning';
    if (text.includes('monitor') || text.includes('telemetry')) return 'monitoring';
    if (text.includes('identity') || text.includes('auth')) return 'identity';
    if (text.includes('api')) return 'api-security';

    return 'general-security';
  }

  /**
   * Perform full scan
   */
  async performFullScan(): Promise<ScanResult> {
    const [awesomeList, trending, recommendations] = await Promise.all([
      this.scanAwesomeCybersecurity(),
      this.scanTrending(),
      this.generateRecommendations(),
    ]);

    const result: ScanResult = {
      timestamp: new Date(),
      awesomeList,
      trending,
      recommendations,
    };

    this.lastScan = result;
    this.scanHistory.push(result);

    // Keep only last 10 scans
    if (this.scanHistory.length > 10) {
      this.scanHistory = this.scanHistory.slice(-10);
    }

    return result;
  }

  /**
   * Get last scan result
   */
  getLastScan(): ScanResult | null {
    return this.lastScan;
  }

  /**
   * Get scan history
   */
  getScanHistory(): ScanResult[] {
    return this.scanHistory;
  }

  /**
   * Check if a tool is already integrated
   */
  isToolIntegrated(toolName: string): boolean {
    const integratedTools = [
      'owasp-llm-top-10',
      'trufflehog', // Patterns used in secretsScanner
      'falco', // Concepts in agentMonitor
    ];

    return integratedTools.some(tool => 
      toolName.toLowerCase().includes(tool) || tool.includes(toolName.toLowerCase())
    );
  }
}

// Singleton instance
export const githubScanner = new GitHubScanner();
