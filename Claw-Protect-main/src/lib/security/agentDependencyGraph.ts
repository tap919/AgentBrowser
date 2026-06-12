/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Agent Dependency Graph & SBOM — Inspired by agentic-radar + Snyk
 *
 * Maps the complete tool / MCP / model / API dependency tree for each
 * AI agent, identifies attack paths, and generates a Software Bill of
 * Materials (SBOM) specific to LLM agent deployments.
 *
 * Key concepts:
 *   • From agentic-radar: workflow visualization, tool inventory,
 *     vulnerability mapping to OWASP, framework scanning
 *   • From Snyk: SBOM generation, automated fix recommendations,
 *     continuous vulnerability tracking
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type NodeType =
  | 'agent'
  | 'tool'
  | 'mcp_server'
  | 'model'
  | 'api'
  | 'database'
  | 'service';

export type EdgeType =
  | 'calls'
  | 'reads'
  | 'writes'
  | 'delegates'
  | 'authenticates';

export type VulnSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface DependencyNode {
  id: string;
  name: string;
  type: NodeType;
  version?: string;
  ecosystem?: string;       // npm, pip, mcp, etc.
  trusted: boolean;
  riskScore: number;        // 0-100
  vulnerabilities: NodeVulnerability[];
  metadata: Record<string, unknown>;
}

export interface DependencyEdge {
  id: string;
  source: string;           // node ID
  target: string;           // node ID
  type: EdgeType;
  dataFlow?: string;        // e.g. "credentials", "user_data"
  encrypted: boolean;
}

export interface NodeVulnerability {
  id: string;
  severity: VulnSeverity;
  title: string;
  description: string;
  cve?: string;
  owaspRef?: string;         // e.g. "LLM01"
  fixAvailable: boolean;
  fixRecommendation?: string;
}

export interface SBOMEntry {
  name: string;
  version: string;
  type: NodeType;
  ecosystem: string;
  license?: string;
  trusted: boolean;
  vulnerabilityCount: number;
  criticalCount: number;
}

export interface AttackPath {
  id: string;
  name: string;
  description: string;
  severity: VulnSeverity;
  nodeChain: string[];        // IDs of nodes in the path
  owaspMapping: string[];
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_NODES: Omit<DependencyNode, 'riskScore'>[] = [
  // Agents
  { id: 'agent-openclaw', name: 'openclaw-main', type: 'agent', version: '2.1.0', trusted: true, vulnerabilities: [], metadata: { framework: 'OpenAI Agents' } },
  { id: 'agent-hermes', name: 'hermes-worker', type: 'agent', version: '1.4.0', trusted: true, vulnerabilities: [], metadata: { framework: 'LangGraph' } },
  { id: 'agent-research', name: 'hermes-research', type: 'agent', version: '1.2.0', trusted: true, vulnerabilities: [], metadata: { framework: 'CrewAI' } },
  // Tools
  { id: 'tool-websearch', name: 'web-search', type: 'tool', version: '3.1.0', ecosystem: 'mcp', trusted: true, vulnerabilities: [], metadata: {} },
  { id: 'tool-codeexec', name: 'code-executor', type: 'tool', version: '2.0.1', ecosystem: 'mcp', trusted: true, vulnerabilities: [
    { id: 'vuln-ce-1', severity: 'high', title: 'Sandbox Escape', description: 'Code executor allows escape from sandbox via symlink', owaspRef: 'LLM08', fixAvailable: true, fixRecommendation: 'Upgrade to code-executor@2.1.0' },
  ], metadata: {} },
  { id: 'tool-fileio', name: 'file-io', type: 'tool', version: '1.0.3', ecosystem: 'mcp', trusted: true, vulnerabilities: [], metadata: {} },
  { id: 'tool-sqlquery', name: 'sql-query', type: 'tool', version: '1.2.0', ecosystem: 'npm', trusted: true, vulnerabilities: [
    { id: 'vuln-sql-1', severity: 'critical', title: 'SQL Injection', description: 'Unsanitized user input passed to SQL query builder', cve: 'CVE-2026-MOCK-001', owaspRef: 'LLM02', fixAvailable: true, fixRecommendation: 'Upgrade to sql-query@1.3.0 with parameterized queries' },
  ], metadata: {} },
  { id: 'tool-unknown', name: 'data-helper', type: 'tool', version: '0.9.0', ecosystem: 'pip', trusted: false, vulnerabilities: [
    { id: 'vuln-unk-1', severity: 'medium', title: 'Unverified Source', description: 'Package not found in official registries', owaspRef: 'LLM05', fixAvailable: false, fixRecommendation: 'Verify package authenticity or replace with trusted alternative' },
  ], metadata: {} },
  // MCP Servers
  { id: 'mcp-filesystem', name: 'filesystem-server', type: 'mcp_server', version: '1.1.0', ecosystem: 'mcp', trusted: true, vulnerabilities: [], metadata: {} },
  { id: 'mcp-browser', name: 'browser-server', type: 'mcp_server', version: '2.0.0', ecosystem: 'mcp', trusted: true, vulnerabilities: [], metadata: {} },
  // Models
  { id: 'model-gpt4', name: 'gpt-4o', type: 'model', version: '2026-04', trusted: true, vulnerabilities: [], metadata: { provider: 'OpenAI' } },
  { id: 'model-gemini', name: 'gemini-2.5-pro', type: 'model', version: '2026-04', trusted: true, vulnerabilities: [], metadata: { provider: 'Google' } },
  // APIs
  { id: 'api-openai', name: 'OpenAI API', type: 'api', version: 'v1', trusted: true, vulnerabilities: [], metadata: {} },
  { id: 'api-external', name: 'External REST API', type: 'api', version: 'v2', trusted: false, vulnerabilities: [
    { id: 'vuln-api-1', severity: 'medium', title: 'No mTLS', description: 'External API does not support mutual TLS', fixAvailable: false },
  ], metadata: {} },
  // Database
  { id: 'db-vector', name: 'vector-store', type: 'database', version: '3.2.0', trusted: true, vulnerabilities: [], metadata: { engine: 'Pinecone' } },
];

const SEED_EDGES: Omit<DependencyEdge, 'id'>[] = [
  { source: 'agent-openclaw', target: 'model-gpt4', type: 'calls', encrypted: true },
  { source: 'agent-openclaw', target: 'tool-websearch', type: 'calls', encrypted: true },
  { source: 'agent-openclaw', target: 'tool-codeexec', type: 'calls', encrypted: true },
  { source: 'agent-openclaw', target: 'tool-fileio', type: 'calls', encrypted: true },
  { source: 'agent-openclaw', target: 'mcp-filesystem', type: 'calls', encrypted: true },
  { source: 'agent-openclaw', target: 'api-openai', type: 'authenticates', dataFlow: 'credentials', encrypted: true },
  { source: 'agent-hermes', target: 'model-gemini', type: 'calls', encrypted: true },
  { source: 'agent-hermes', target: 'tool-sqlquery', type: 'calls', dataFlow: 'user_data', encrypted: true },
  { source: 'agent-hermes', target: 'tool-unknown', type: 'calls', encrypted: false },
  { source: 'agent-hermes', target: 'db-vector', type: 'reads', dataFlow: 'embeddings', encrypted: true },
  { source: 'agent-hermes', target: 'api-external', type: 'calls', dataFlow: 'pii', encrypted: false },
  { source: 'agent-research', target: 'model-gpt4', type: 'calls', encrypted: true },
  { source: 'agent-research', target: 'tool-websearch', type: 'calls', encrypted: true },
  { source: 'agent-research', target: 'mcp-browser', type: 'calls', encrypted: true },
  { source: 'agent-openclaw', target: 'agent-hermes', type: 'delegates', dataFlow: 'task_context', encrypted: true },
  { source: 'agent-openclaw', target: 'agent-research', type: 'delegates', encrypted: true },
];

// ─── Engine ───────────────────────────────────────────────────────────────────

class AgentDependencyGraph {
  private nodes: Map<string, DependencyNode> = new Map();
  private edges: DependencyEdge[] = [];

  constructor() {
    // Seed
    for (const n of SEED_NODES) {
      const riskScore = this.calculateNodeRisk(n);
      this.nodes.set(n.id, { ...n, riskScore });
    }
    for (const e of SEED_EDGES) {
      this.edges.push({ ...e, id: `edge_${Math.random().toString(36).substring(2, 9)}` });
    }
  }

  // ── Nodes ─────────────────────────────────────────────────────────────────

  addNode(node: Omit<DependencyNode, 'riskScore'>): DependencyNode {
    const full: DependencyNode = { ...node, riskScore: this.calculateNodeRisk(node) };
    this.nodes.set(full.id, full);
    return full;
  }

  getNode(id: string): DependencyNode | undefined {
    return this.nodes.get(id);
  }

  getNodes(type?: NodeType): DependencyNode[] {
    const all = Array.from(this.nodes.values());
    return type ? all.filter((n) => n.type === type) : all;
  }

  // ── Edges ─────────────────────────────────────────────────────────────────

  addEdge(edge: Omit<DependencyEdge, 'id'>): DependencyEdge {
    const full: DependencyEdge = {
      ...edge,
      id: `edge_${Math.random().toString(36).substring(2, 9)}`,
    };
    this.edges.push(full);
    return full;
  }

  getEdges(nodeId?: string): DependencyEdge[] {
    if (!nodeId) return this.edges;
    return this.edges.filter((e) => e.source === nodeId || e.target === nodeId);
  }

  /** Get direct dependencies for a node. */
  getDependencies(nodeId: string): DependencyNode[] {
    const targetIds = this.edges
      .filter((e) => e.source === nodeId)
      .map((e) => e.target);
    return targetIds.map((id) => this.nodes.get(id)).filter(Boolean) as DependencyNode[];
  }

  // ── Risk ──────────────────────────────────────────────────────────────────

  private calculateNodeRisk(node: Omit<DependencyNode, 'riskScore'>): number {
    let score = 0;
    if (!node.trusted) score += 30;
    for (const v of node.vulnerabilities) {
      if (v.severity === 'critical') score += 25;
      else if (v.severity === 'high') score += 15;
      else if (v.severity === 'medium') score += 8;
      else score += 3;
    }
    return Math.min(100, score);
  }

  /** Find all vulnerable nodes. */
  getVulnerableNodes(): DependencyNode[] {
    return Array.from(this.nodes.values())
      .filter((n) => n.vulnerabilities.length > 0)
      .sort((a, b) => b.riskScore - a.riskScore);
  }

  /** Detect attack paths — chains of nodes where risk propagates. */
  detectAttackPaths(): AttackPath[] {
    const paths: AttackPath[] = [];
    const vulnNodes = this.getVulnerableNodes();

    for (const vulnNode of vulnNodes) {
      // Find agents that depend on this vulnerable node
      const dependentAgents = this.edges
        .filter((e) => e.target === vulnNode.id && this.nodes.get(e.source)?.type === 'agent')
        .map((e) => e.source);

      for (const agentId of dependentAgents) {
        const agent = this.nodes.get(agentId);
        if (!agent) continue;

        for (const vuln of vulnNode.vulnerabilities) {
          paths.push({
            id: `path_${Math.random().toString(36).substring(2, 9)}`,
            name: `${agent.name} → ${vulnNode.name}: ${vuln.title}`,
            description: `Agent "${agent.name}" depends on "${vulnNode.name}" which has vulnerability: ${vuln.description}`,
            severity: vuln.severity,
            nodeChain: [agentId, vulnNode.id],
            owaspMapping: vuln.owaspRef ? [vuln.owaspRef] : [],
          });
        }
      }
    }

    // Also detect unencrypted data flows
    for (const edge of this.edges) {
      if (!edge.encrypted && edge.dataFlow) {
        const source = this.nodes.get(edge.source);
        const target = this.nodes.get(edge.target);
        if (source && target) {
          paths.push({
            id: `path_${Math.random().toString(36).substring(2, 9)}`,
            name: `Unencrypted ${edge.dataFlow}: ${source.name} → ${target.name}`,
            description: `Data flow "${edge.dataFlow}" between "${source.name}" and "${target.name}" is not encrypted`,
            severity: edge.dataFlow === 'credentials' || edge.dataFlow === 'pii' ? 'critical' : 'high',
            nodeChain: [edge.source, edge.target],
            owaspMapping: ['LLM06'],
          });
        }
      }
    }

    return paths.sort((a, b) => {
      const order: Record<VulnSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.severity] - order[b.severity];
    });
  }

  // ── SBOM ──────────────────────────────────────────────────────────────────

  /** Generate Software Bill of Materials. */
  generateSBOM(): SBOMEntry[] {
    return Array.from(this.nodes.values())
      .filter((n) => n.type !== 'agent')
      .map((n) => ({
        name: n.name,
        version: n.version ?? 'unknown',
        type: n.type,
        ecosystem: n.ecosystem ?? n.type,
        trusted: n.trusted,
        vulnerabilityCount: n.vulnerabilities.length,
        criticalCount: n.vulnerabilities.filter((v) => v.severity === 'critical').length,
      }))
      .sort((a, b) => b.criticalCount - a.criticalCount || b.vulnerabilityCount - a.vulnerabilityCount);
  }

  // ── Statistics ─────────────────────────────────────────────────────────────

  getStatistics(): {
    totalNodes: number;
    totalEdges: number;
    agents: number;
    tools: number;
    models: number;
    vulnerableComponents: number;
    criticalVulnerabilities: number;
    untrustedComponents: number;
    unencryptedFlows: number;
    attackPaths: number;
  } {
    const nodes = Array.from(this.nodes.values());
    const vulnComponents = nodes.filter((n) => n.vulnerabilities.length > 0);
    let critCount = 0;
    for (const n of vulnComponents) {
      critCount += n.vulnerabilities.filter((v) => v.severity === 'critical').length;
    }

    return {
      totalNodes: nodes.length,
      totalEdges: this.edges.length,
      agents: nodes.filter((n) => n.type === 'agent').length,
      tools: nodes.filter((n) => n.type === 'tool' || n.type === 'mcp_server').length,
      models: nodes.filter((n) => n.type === 'model').length,
      vulnerableComponents: vulnComponents.length,
      criticalVulnerabilities: critCount,
      untrustedComponents: nodes.filter((n) => !n.trusted).length,
      unencryptedFlows: this.edges.filter((e) => !e.encrypted).length,
      attackPaths: this.detectAttackPaths().length,
    };
  }
}

// Singleton
export const agentDependencyGraph = new AgentDependencyGraph();
