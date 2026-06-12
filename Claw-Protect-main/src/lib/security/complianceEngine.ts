/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Compliance & Guardrails Engine — Inspired by Cisco AI Defense
 *
 * Provides enterprise-grade policy enforcement, compliance tracking, and
 * organizational guardrails for AI agent deployments.
 *
 * Key concepts from Cisco AI Defense:
 *   • Policy-based access control & enforcement
 *   • SOC 2 / HIPAA / PCI-DSS / ISO 27001 audit trail generation
 *   • Organization-wide guardrails with per-agent overrides
 *   • Immutable compliance event log for SIEM export
 *   • Composite risk scoring that aggregates all security signals
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ComplianceFramework =
  | 'SOC2'
  | 'HIPAA'
  | 'PCI_DSS'
  | 'ISO_27001'
  | 'NIST_AI_RMF'
  | 'OWASP_LLM_TOP10';

export type ControlStatus = 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';

export interface ComplianceControl {
  id: string;
  framework: ComplianceFramework;
  controlRef: string;      // e.g. "CC6.1" for SOC2
  title: string;
  description: string;
  status: ControlStatus;
  evidence: string[];       // pointers to audit events
  lastAssessed: Date;
  owner: string;
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  condition: string;        // human-readable condition
  action: 'block' | 'flag' | 'log' | 'notify';
  scope: 'global' | 'agent' | 'tool';
  scopeTargets?: string[];  // agent / tool IDs when scope != global
  createdAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
}

export interface ComplianceEvent {
  id: string;
  timestamp: Date;
  framework?: ComplianceFramework;
  controlId?: string;
  policyId?: string;
  agentId?: string;
  eventType: 'policy_trigger' | 'control_check' | 'audit_export' | 'risk_assessment';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metadata: Record<string, unknown>;
}

export interface RiskScore {
  agentId: string;
  overall: number;          // 0-100
  dimensions: {
    promptInjection: number;
    behavioralDrift: number;
    dataExfiltration: number;
    supplyChain: number;
    permissions: number;
    compliance: number;
  };
  lastUpdated: Date;
}

// ─── Default Policy Rules ─────────────────────────────────────────────────────

const DEFAULT_POLICIES: Omit<PolicyRule, 'id' | 'createdAt' | 'triggerCount'>[] = [
  {
    name: 'Block Unapproved External APIs',
    description: 'Prevent agents from contacting domains not on the allow-list',
    enabled: true,
    severity: 'high',
    condition: 'agent.outbound_request.domain NOT IN approved_domains',
    action: 'block',
    scope: 'global',
  },
  {
    name: 'Flag Sensitive Data Access',
    description: 'Log when agents access PII or financial data',
    enabled: true,
    severity: 'medium',
    condition: 'agent.data_access.classification IN [PII, FINANCIAL, HEALTH]',
    action: 'flag',
    scope: 'global',
  },
  {
    name: 'Require Human Approval for Deletions',
    description: 'Block destructive operations without human-in-the-loop',
    enabled: true,
    severity: 'critical',
    condition: 'agent.action == DELETE AND resource.type IN [database, storage, config]',
    action: 'block',
    scope: 'global',
  },
  {
    name: 'Enforce Model Allow-list',
    description: 'Only permit approved LLM model identifiers',
    enabled: true,
    severity: 'high',
    condition: 'agent.model NOT IN approved_models',
    action: 'block',
    scope: 'global',
  },
  {
    name: 'Rate Limit Agent Actions',
    description: 'Flag agents exceeding 100 actions per minute',
    enabled: true,
    severity: 'medium',
    condition: 'agent.actions_per_minute > 100',
    action: 'flag',
    scope: 'global',
  },
  {
    name: 'Audit Trail Integrity',
    description: 'Alert if audit log tamper detection fails',
    enabled: true,
    severity: 'critical',
    condition: 'audit.integrity_check == FAILED',
    action: 'notify',
    scope: 'global',
  },
];

// ─── Default Compliance Controls ──────────────────────────────────────────────

const DEFAULT_CONTROLS: Omit<ComplianceControl, 'lastAssessed'>[] = [
  // SOC2
  { id: 'soc2-cc6.1', framework: 'SOC2', controlRef: 'CC6.1', title: 'Logical Access Controls', description: 'Restrict system access to authorized users/agents', status: 'compliant', evidence: [], owner: 'Security Team' },
  { id: 'soc2-cc6.3', framework: 'SOC2', controlRef: 'CC6.3', title: 'Role-Based Access', description: 'Enforce least-privilege via RBAC', status: 'compliant', evidence: [], owner: 'Security Team' },
  { id: 'soc2-cc7.2', framework: 'SOC2', controlRef: 'CC7.2', title: 'Anomaly Detection', description: 'Monitor and alert on unusual agent behavior', status: 'compliant', evidence: [], owner: 'Security Team' },
  { id: 'soc2-cc8.1', framework: 'SOC2', controlRef: 'CC8.1', title: 'Change Management', description: 'Control changes to agent configurations', status: 'partial', evidence: [], owner: 'DevOps' },

  // HIPAA
  { id: 'hipaa-164.312a', framework: 'HIPAA', controlRef: '164.312(a)', title: 'Access Control', description: 'Unique agent identification and emergency access', status: 'compliant', evidence: [], owner: 'Compliance' },
  { id: 'hipaa-164.312b', framework: 'HIPAA', controlRef: '164.312(b)', title: 'Audit Controls', description: 'Record and examine agent activity', status: 'compliant', evidence: [], owner: 'Compliance' },
  { id: 'hipaa-164.312c', framework: 'HIPAA', controlRef: '164.312(c)', title: 'Integrity Controls', description: 'Protect ePHI from improper alteration', status: 'partial', evidence: [], owner: 'Compliance' },

  // OWASP LLM Top 10
  { id: 'owasp-llm01', framework: 'OWASP_LLM_TOP10', controlRef: 'LLM01', title: 'Prompt Injection', description: 'Detect and block prompt injection attacks', status: 'compliant', evidence: [], owner: 'AI Security' },
  { id: 'owasp-llm02', framework: 'OWASP_LLM_TOP10', controlRef: 'LLM02', title: 'Insecure Output', description: 'Validate and sanitize LLM outputs', status: 'partial', evidence: [], owner: 'AI Security' },
  { id: 'owasp-llm05', framework: 'OWASP_LLM_TOP10', controlRef: 'LLM05', title: 'Supply Chain', description: 'Verify tool/plugin integrity', status: 'compliant', evidence: [], owner: 'AI Security' },
  { id: 'owasp-llm06', framework: 'OWASP_LLM_TOP10', controlRef: 'LLM06', title: 'Sensitive Data Disclosure', description: 'Prevent leakage of sensitive data', status: 'compliant', evidence: [], owner: 'AI Security' },
  { id: 'owasp-llm08', framework: 'OWASP_LLM_TOP10', controlRef: 'LLM08', title: 'Excessive Agency', description: 'Limit autonomous agent capabilities', status: 'partial', evidence: [], owner: 'AI Security' },

  // NIST AI RMF
  { id: 'nist-govern1', framework: 'NIST_AI_RMF', controlRef: 'GOVERN 1', title: 'AI Governance', description: 'Policies for responsible AI agent deployment', status: 'partial', evidence: [], owner: 'Governance' },
  { id: 'nist-map2', framework: 'NIST_AI_RMF', controlRef: 'MAP 2', title: 'Risk Identification', description: 'Identify and categorize AI agent risks', status: 'compliant', evidence: [], owner: 'Risk Team' },
  { id: 'nist-measure3', framework: 'NIST_AI_RMF', controlRef: 'MEASURE 3', title: 'Risk Measurement', description: 'Quantify agent risk with composite scoring', status: 'compliant', evidence: [], owner: 'Risk Team' },
];

// ─── KEV interface (structural — avoids circular import) ──────────────────────

interface KevLookup {
  lookupCve(cveId: string): { cveID: string; knownRansomwareCampaignUse: string; requiredAction: string } | undefined;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

class ComplianceEngine {
  private policies: Map<string, PolicyRule> = new Map();
  private controls: Map<string, ComplianceControl> = new Map();
  private events: ComplianceEvent[] = [];
  private riskScores: Map<string, RiskScore> = new Map();
  private kevService: KevLookup | undefined;

  /** Inject the KEV service at startup (avoids circular import). */
  setKevService(svc: KevLookup): void {
    this.kevService = svc;
  }

  constructor() {
    // Seed default policies
    for (const p of DEFAULT_POLICIES) {
      const id = `pol_${Math.random().toString(36).substring(2, 9)}`;
      this.policies.set(id, { ...p, id, createdAt: new Date(), triggerCount: 0 });
    }

    // Seed default controls
    const now = new Date();
    for (const c of DEFAULT_CONTROLS) {
      this.controls.set(c.id, { ...c, lastAssessed: now });
    }
  }

  // ── Policies ──────────────────────────────────────────────────────────────

  /** Get all policy rules. */
  getPolicies(): PolicyRule[] {
    return Array.from(this.policies.values());
  }

  /** Create a new policy rule. */
  createPolicy(rule: Omit<PolicyRule, 'id' | 'createdAt' | 'triggerCount'>): PolicyRule {
    const id = `pol_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const policy: PolicyRule = { ...rule, id, createdAt: new Date(), triggerCount: 0 };
    this.policies.set(id, policy);
    return policy;
  }

  /** Toggle a policy on/off. */
  togglePolicy(id: string): PolicyRule | undefined {
    const p = this.policies.get(id);
    if (p) p.enabled = !p.enabled;
    return p;
  }

  /** Record a policy trigger event. */
  triggerPolicy(policyId: string, agentId: string, metadata: Record<string, unknown> = {}): ComplianceEvent | undefined {
    const policy = this.policies.get(policyId);
    if (!policy) return undefined;

    policy.triggerCount++;
    policy.lastTriggered = new Date();

    return this.logEvent({
      policyId,
      agentId,
      eventType: 'policy_trigger',
      severity:
        policy.severity === 'critical'
          ? 'critical'
          : policy.severity === 'high'
            ? 'high'
            : policy.severity === 'medium'
              ? 'medium'
              : 'low',
      message: `Policy "${policy.name}" triggered by agent ${agentId}: ${policy.condition}`,
      metadata: { ...metadata, action: policy.action },
    });
  }

  // ── Controls ──────────────────────────────────────────────────────────────

  /** Get controls, optionally filtered by framework. */
  getControls(framework?: ComplianceFramework): ComplianceControl[] {
    const all = Array.from(this.controls.values());
    return framework ? all.filter((c) => c.framework === framework) : all;
  }

  /** Update a control's status. */
  updateControlStatus(controlId: string, status: ControlStatus, evidence?: string): ComplianceControl | undefined {
    const ctrl = this.controls.get(controlId);
    if (!ctrl) return undefined;

    ctrl.status = status;
    ctrl.lastAssessed = new Date();
    if (evidence) ctrl.evidence.push(evidence);

    this.logEvent({
      framework: ctrl.framework,
      controlId,
      eventType: 'control_check',
      severity: status === 'non_compliant' ? 'high' : 'info',
      message: `Control ${ctrl.controlRef} "${ctrl.title}" assessed as ${status}`,
      metadata: { evidence },
    });

    return ctrl;
  }

  /** Get compliance summary for a framework. */
  getFrameworkSummary(framework: ComplianceFramework): {
    total: number;
    compliant: number;
    partial: number;
    nonCompliant: number;
    score: number;
  } {
    const controls = this.getControls(framework);
    const compliant = controls.filter((c) => c.status === 'compliant').length;
    const partial = controls.filter((c) => c.status === 'partial').length;
    const nonCompliant = controls.filter((c) => c.status === 'non_compliant').length;
    const applicable = controls.filter((c) => c.status !== 'not_applicable').length;

    return {
      total: controls.length,
      compliant,
      partial,
      nonCompliant,
      score: applicable > 0
        ? Math.round(((compliant + partial * 0.5) / applicable) * 100)
        : 100,
    };
  }

  // ── Risk Scoring ──────────────────────────────────────────────────────────

  /** Calculate or update composite risk score for an agent. */
  calculateRiskScore(
    agentId: string,
    dimensions: RiskScore['dimensions'],
    cveIds?: string[],
  ): RiskScore {
    const weights = {
      promptInjection: 0.25,
      behavioralDrift: 0.20,
      dataExfiltration: 0.20,
      supplyChain: 0.15,
      permissions: 0.10,
      compliance: 0.10,
    };

    // Apply KEV boost: +10 per KEV-confirmed CVE, capped at +25, added to supplyChain dimension
    let kevBoost = 0;
    const kevMatches: string[] = [];
    if (this.kevService && cveIds && cveIds.length > 0) {
      for (const cveId of cveIds) {
        const entry = this.kevService.lookupCve(cveId);
        if (entry) {
          kevBoost += 10;
          kevMatches.push(cveId);
        }
      }
      kevBoost = Math.min(kevBoost, 25);
    }

    const boostedDimensions = kevBoost > 0
      ? { ...dimensions, supplyChain: Math.min(100, dimensions.supplyChain + kevBoost) }
      : dimensions;

    const overall = Math.min(100, Math.round(
      Object.entries(boostedDimensions).reduce(
        (sum, [key, val]) => sum + val * (weights[key as keyof typeof weights] ?? 0),
        0,
      ),
    ));

    const score: RiskScore = { agentId, overall, dimensions: boostedDimensions, lastUpdated: new Date() };
    this.riskScores.set(agentId, score);

    // Log KEV event if any CVEs were confirmed in KEV catalog
    if (kevMatches.length > 0) {
      this.logEvent({
        eventType: 'risk_assessment',
        agentId,
        severity: 'critical',
        message: `KEV-confirmed CVEs detected for agent ${agentId}: ${kevMatches.join(', ')}. Supply chain risk score boosted by ${kevBoost} points.`,
        metadata: { kevCves: kevMatches, kevBoost, overallScore: overall },
      });
    }

    return score;
  }

  /** Get risk score for an agent. */
  getRiskScore(agentId: string): RiskScore | undefined {
    return this.riskScores.get(agentId);
  }

  /** Get all risk scores sorted high → low. */
  getAllRiskScores(): RiskScore[] {
    return Array.from(this.riskScores.values()).sort((a, b) => b.overall - a.overall);
  }

  // ── Events / Audit ────────────────────────────────────────────────────────

  /** Log a compliance event. */
  logEvent(event: Omit<ComplianceEvent, 'id' | 'timestamp'>): ComplianceEvent {
    const full: ComplianceEvent = {
      ...event,
      id: `cev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
    };
    this.events.push(full);

    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000);
    }

    return full;
  }

  /** Get recent compliance events. */
  getEvents(limit: number = 100): ComplianceEvent[] {
    return this.events.slice(-limit).reverse();
  }

  /** Export audit log as JSON string (for SIEM integration). */
  exportAuditLog(
    framework?: ComplianceFramework,
    startDate?: Date,
    endDate?: Date,
  ): string {
    let filtered = this.events;
    if (framework) filtered = filtered.filter((e) => e.framework === framework);
    if (startDate) filtered = filtered.filter((e) => e.timestamp >= startDate);
    if (endDate) filtered = filtered.filter((e) => e.timestamp <= endDate);

    this.logEvent({
      eventType: 'audit_export',
      severity: 'info',
      message: `Audit log exported: ${filtered.length} events`,
      metadata: { framework, startDate, endDate },
    });

    return JSON.stringify(
      { exportDate: new Date().toISOString(), eventCount: filtered.length, events: filtered },
      null,
      2,
    );
  }

  /** Get list of supported compliance frameworks. */
  getSupportedFrameworks(): ComplianceFramework[] {
    return ['SOC2', 'HIPAA', 'PCI_DSS', 'ISO_27001', 'NIST_AI_RMF', 'OWASP_LLM_TOP10'];
  }
}

// Singleton
export const complianceEngine = new ComplianceEngine();
