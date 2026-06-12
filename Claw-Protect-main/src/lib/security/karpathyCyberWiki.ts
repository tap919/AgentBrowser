/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Karpathy Cyber Wiki — LLM-as-Compiler, Living Threat Knowledge Base
// Implements the three-layer architecture described in the Karpathy wiki pattern:
//   Layer 1 — Raw Sources   (immutable, forensic-grade)
//   Layer 2 — The Wiki      (LLM-maintained, cross-linked knowledge base)
//   Layer 3 — Query Layer   (analyst interface; answers filed back as new pages)
//
// Key operations: ingest, query, lint (health-check), synthesize
// Security meta-layer: prompt-injection guard, data-poisoning detection, AI-BOM

// ─── Layer 1: Raw Sources ─────────────────────────────────────────────────────

export type RawSourceType =
  | 'CVE_NVD_FEED'
  | 'OSINT_DUMP'
  | 'PENTEST_REPORT'
  | 'RED_TEAM_LOG'
  | 'VENDOR_ADVISORY'
  | 'THREAT_INTEL_REPORT'
  | 'STIX_BUNDLE'
  | 'IOC_LIST';

export interface RawSource {
  id: string;
  type: RawSourceType;
  title: string;
  content: string;
  /** Non-cryptographic djb2-style fingerprint used for change detection only.
   *  This field is not a forensic-grade integrity hash and should not be
   *  treated as a preserved SHA-256 digest. */
  contentHash: string;
  ingestedAt: Date;
  origin: string; // URL or feed name
  poisoningRiskScore: number; // 0-100; elevated by prompt-injection heuristics
}

// ─── MITRE ATT&CK Schema ─────────────────────────────────────────────────────

export type MitreTactic =
  | 'Reconnaissance'
  | 'Resource Development'
  | 'Initial Access'
  | 'Execution'
  | 'Persistence'
  | 'Privilege Escalation'
  | 'Defense Evasion'
  | 'Credential Access'
  | 'Discovery'
  | 'Lateral Movement'
  | 'Collection'
  | 'Command and Control'
  | 'Exfiltration'
  | 'Impact';

export interface MitreTechnique {
  id: string;       // e.g. "T1566"
  name: string;     // e.g. "Phishing"
  tactic: MitreTactic;
  description: string;
  subTechniques?: string[];
  mitigations?: string[];
}

// ─── Layer 2: The Wiki ────────────────────────────────────────────────────────

export type WikiPageType =
  | 'threat-actor'
  | 'tactic'
  | 'technique'
  | 'cve'
  | 'ioc'
  | 'asset-risk'
  | 'threat-landscape'
  | 'query-result';

export interface WikiPage {
  id: string;
  type: WikiPageType;
  title: string;
  summary: string;
  body: string;
  tags: string[];
  relatedPages: string[]; // IDs of cross-linked wiki pages
  sourceIds: string[];    // IDs of raw sources that contributed to this page
  attackTechniqueIds: string[]; // MITRE ATT&CK technique IDs referenced
  severity?: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  updatedAt: Date;
  staleness: number; // 0-100; higher = more likely outdated
  health: 'healthy' | 'stale' | 'orphaned' | 'contradicted';
}

export interface ThreatActorPage extends WikiPage {
  type: 'threat-actor';
  aliases: string[];
  motivation: string;
  targetSectors: string[];
  observedTTPs: string[]; // ATT&CK technique IDs
  knownIOCs: string[];
  associatedMalware: string[];
}

export interface CVEPage extends WikiPage {
  type: 'cve';
  cveId: string;
  cvssScore: number;    // 0.0-10.0
  affectedProducts: string[];
  exploitedInWild: boolean;
  patchStatus: 'unpatched' | 'patch-available' | 'patched';
  associatedActors: string[];
}

export interface IOCPage extends WikiPage {
  type: 'ioc';
  indicator: string;
  indicatorType: 'ip' | 'domain' | 'hash' | 'email' | 'url' | 'path';
  firstSeen: Date;
  lastSeen: Date;
  associatedActors: string[];
  confidence: number; // 0-100
}

// ─── Layer 3: Query Layer ─────────────────────────────────────────────────────

export interface WikiQuery {
  id: string;
  text: string;
  intent: 'actor-lookup' | 'ttp-search' | 'cve-check' | 'ioc-search' | 'landscape' | 'free-form';
  answeredAt: Date;
  answer: string;
  citedPageIds: string[];
  confidence: number; // 0-100
  filedAsPage: boolean; // true when the answer is persisted as a new wiki page
}

// ─── Lint / Health Report ─────────────────────────────────────────────────────

export interface WikiHealthReport {
  generatedAt: Date;
  totalPages: number;
  healthyPages: number;
  stalePages: number;
  orphanedPages: number;
  contradictedPages: number;
  staleCveCount: number;     // CVEs marked open but now patched
  orphanedIocCount: number;  // IOCs with no threat actor linkage
  contradictions: WikiContradiction[];
  healthScore: number; // 0-100
}

export interface WikiContradiction {
  pageId: string;
  field: string;
  conflictingSourceIds: string[];
  description: string;
}

// ─── AI-BOM (AI Bill of Materials) ───────────────────────────────────────────

export interface AIBOMEntry {
  componentId: string;
  componentType: 'llm-pipeline' | 'inference-endpoint' | 'data-source' | 'embedding-model';
  name: string;
  version: string;
  trustLevel: 'trusted' | 'verified' | 'unverified' | 'quarantined';
  lastAuditedAt: Date;
}

// ─── Ingest Result ────────────────────────────────────────────────────────────

export interface IngestResult {
  rawSourceId: string;
  pagesCreated: number;
  pagesUpdated: number;
  extractedIOCs: string[];
  mappedTechniques: string[];
  poisoningRiskScore: number;
  promptInjectionDetected: boolean;
  warnings: string[];
}

// ─── Synthesis ────────────────────────────────────────────────────────────────

export interface ThreatLandscapeSynthesis {
  generatedAt: Date;
  topActors: Array<{ actorName: string; activityScore: number }>;
  topTechniques: Array<{ techniqueId: string; name: string; frequency: number }>;
  criticalCVEs: string[];
  emergingThreats: string[];
  summary: string;
}

// ─── Core MITRE ATT&CK Catalogue (representative subset) ─────────────────────

const MITRE_TECHNIQUES: MitreTechnique[] = [
  { id: 'T1566', name: 'Phishing', tactic: 'Initial Access', description: 'Adversary sends phishing messages to gain access.', subTechniques: ['T1566.001', 'T1566.002'] },
  { id: 'T1078', name: 'Valid Accounts', tactic: 'Defense Evasion', description: 'Use of legitimate credentials to access systems.', mitigations: ['MFA', 'Privileged Account Management'] },
  { id: 'T1059', name: 'Command and Scripting Interpreter', tactic: 'Execution', description: 'Abuse of command interpreters.', subTechniques: ['T1059.001', 'T1059.003'] },
  { id: 'T1486', name: 'Data Encrypted for Impact', tactic: 'Impact', description: 'Encryption of data to prevent access (ransomware).', mitigations: ['Backups', 'Endpoint Protection'] },
  { id: 'T1021', name: 'Remote Services', tactic: 'Lateral Movement', description: 'Use of remote services for lateral movement.', subTechniques: ['T1021.001', 'T1021.004'] },
  { id: 'T1190', name: 'Exploit Public-Facing Application', tactic: 'Initial Access', description: 'Exploit vulnerabilities in internet-facing applications.' },
  { id: 'T1055', name: 'Process Injection', tactic: 'Privilege Escalation', description: 'Inject code into running processes.' },
  { id: 'T1071', name: 'Application Layer Protocol', tactic: 'Command and Control', description: 'Use standard protocols for C2 communication.' },
  { id: 'T1041', name: 'Exfiltration Over C2 Channel', tactic: 'Exfiltration', description: 'Exfiltrate data over the C2 channel.' },
  { id: 'T1110', name: 'Brute Force', tactic: 'Credential Access', description: 'Attempt to guess credentials.' },
  { id: 'T1562', name: 'Impair Defenses', tactic: 'Defense Evasion', description: 'Disable or modify defensive tools.' },
  { id: 'T1082', name: 'System Information Discovery', tactic: 'Discovery', description: 'Gather detailed information about the OS and hardware.' },
  { id: 'T1003', name: 'OS Credential Dumping', tactic: 'Credential Access', description: 'Dump credentials from OS and software.' },
  { id: 'T1105', name: 'Ingress Tool Transfer', tactic: 'Command and Control', description: 'Transfer tools from external system.' },
  { id: 'T1588', name: 'Obtain Capabilities', tactic: 'Resource Development', description: 'Adversary obtains capabilities such as malware.' },
];

// ─── Prompt Injection Heuristics ─────────────────────────────────────────────

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(previous|all|above)\s+instructions?/i,
  /forget\s+(everything|all)\s+(you\s+)?(know|learned)/i,
  /\bsystem\s*prompt\b/i,
  /act\s+as\s+(an?\s+)?unrestricted/i,
  /jailbreak/i,
  /disregard\s+(your\s+)?(safety|guidelines?|rules?)/i,
  /\bDAN\b/i,
  /override\s+(safety|content)\s+filter/i,
  /write\s+malware|generate\s+exploit/i,
  /<\s*script[^>]*>/i,
  /\bexec\s*\(/i,
  /\beval\s*\(/i,
];

// ─── KarpathyCyberWiki Class ──────────────────────────────────────────────────

class BoundedMap<K, V> extends Map<K, V> {
  constructor(private readonly maxEntries: number) {
    super();
  }

  override set(key: K, value: V): this {
    super.set(key, value);

    while (this.size > this.maxEntries) {
      const oldestKey = this.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      this.delete(oldestKey);
    }

    return this;
  }
}

export class KarpathyCyberWiki {
  private static readonly MAX_RAW_SOURCES = 5000;
  private static readonly MAX_PAGES = 2000;
  private static readonly MAX_AI_BOM_ENTRIES = 5000;
  private static readonly MAX_TECHNIQUE_FREQUENCIES = 2000;

  // Layer 1 — immutable raw sources
  private readonly rawSources: Map<string, RawSource> = new BoundedMap<string, RawSource>(
    KarpathyCyberWiki.MAX_RAW_SOURCES,
  );

  // Layer 2 — wiki pages
  private readonly pages: Map<string, WikiPage> = new BoundedMap<string, WikiPage>(
    KarpathyCyberWiki.MAX_PAGES,
  );

  // Layer 3 — query history (answers also optionally filed as pages)
  private queryHistory: WikiQuery[] = [];

  // AI-BOM registry
  private readonly aiBOM: Map<string, AIBOMEntry> = new BoundedMap<string, AIBOMEntry>(
    KarpathyCyberWiki.MAX_AI_BOM_ENTRIES,
  );

  // Technique frequency tracker (for synthesis)
  private techniqueFrequency: Map<string, number> = new BoundedMap<string, number>(
    KarpathyCyberWiki.MAX_TECHNIQUE_FREQUENCIES,
  );

  // ─── Internal Helpers ─────────────────────────────────────────────────────

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
  }

  /**
   * Compute a djb2 fingerprint for fast change-detection.
   * This is NOT a cryptographic hash — for forensic-grade tamper-evidence,
   * pass a SHA-256 produced via crypto.subtle.digest into contentHash externally.
   */
  private simpleHash(text: string): string {
    let hash = 5381;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
      hash = hash >>> 0; // keep unsigned 32-bit
    }
    return hash.toString(16).padStart(8, '0');
  }

  /**
   * Scan raw content for known prompt-injection patterns.
   * Returns a risk score 0-100.
   */
  private assessPromptInjectionRisk(content: string): { score: number; detected: boolean } {
    let matchCount = 0;
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(content)) matchCount++;
    }
    const score = Math.min(100, matchCount * 25);
    return { score, detected: matchCount > 0 };
  }

  /**
   * Map free-text content to relevant MITRE ATT&CK technique IDs.
   */
  private mapToAttackTechniques(text: string): string[] {
    const lower = text.toLowerCase();
    const matched: string[] = [];

    /** Record a technique match and increment its frequency counter. */
    const addTechnique = (id: string) => {
      if (!matched.includes(id)) {
        matched.push(id);
      }
      this.techniqueFrequency.set(id, (this.techniqueFrequency.get(id) ?? 0) + 1);
    };

    for (const t of MITRE_TECHNIQUES) {
      if (lower.includes(t.name.toLowerCase()) || lower.includes(t.id.toLowerCase())) {
        addTechnique(t.id);
      }
    }

    // Keyword fallback mappings
    if (lower.includes('phish')) addTechnique('T1566');
    if (lower.includes('ransomware') || lower.includes('encrypt')) addTechnique('T1486');
    if (lower.includes('lateral') || lower.includes('rdp') || lower.includes('smb')) addTechnique('T1021');
    if (lower.includes('brute') || lower.includes('credential')) addTechnique('T1110');
    if (lower.includes('exfil') || lower.includes('data theft')) addTechnique('T1041');
    if (lower.includes('exploit') || lower.includes('cve-')) addTechnique('T1190');

    return [...new Set(matched)];
  }

  /**
   * Extract IOC candidates from free text (IPs, domains, hashes, emails).
   * Results are best-effort heuristics; they may include false positives and
   * should be validated before operational use.
   */
  private extractIOCs(text: string): string[] {
    const iocs: string[] = [];

    // IPv4 — require each octet 0-255, exclude RFC 1918 and loopback
    const ipRe = /\b((?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))\b/g;
    const ipMatches = [...text.matchAll(ipRe)].map(m => m[1]);
    iocs.push(...ipMatches.filter(ip => {
      const parts = ip.split('.').map(Number);
      if (parts[0] === 10) return false;                                 // 10.0.0.0/8
      if (parts[0] === 127) return false;                                // 127.0.0.0/8
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false; // 172.16.0.0/12
      if (parts[0] === 192 && parts[1] === 168) return false;            // 192.168.0.0/16
      return true;
    }));

    // Domains — require at least one label, a known-length TLD, and exclude
    // strings that look like file extensions or version numbers.
    const domainRe = /\b([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,})\b/gi;
    const domainMatches = [...text.matchAll(domainRe)].map(m => m[1]);
    const DOMAIN_BLOCKLIST = /\.(exe|dll|pdf|doc|docx|zip|tar|gz|png|jpg|jpeg|gif|js|ts|css|html)$/i;
    iocs.push(...domainMatches.filter(d => !DOMAIN_BLOCKLIST.test(d)));

    // MD5/SHA hashes (32, 40, 56, or 64 hex chars)
    const hashRe = /\b([a-f0-9]{64}|[a-f0-9]{56}|[a-f0-9]{40}|[a-f0-9]{32})\b/gi;
    const hashMatches = [...text.matchAll(hashRe)].map(m => m[1]);
    iocs.push(...hashMatches);

    // Emails
    const emailMatches = text.match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/gi) ?? [];
    iocs.push(...emailMatches);

    return [...new Set(iocs)].slice(0, 50); // cap at 50 IOCs per ingest
  }

  /**
   * Find or create a wiki page by title; returns existing if found.
   */
  private upsertPage(base: Omit<WikiPage, 'id' | 'createdAt' | 'updatedAt' | 'staleness' | 'health'>): { page: WikiPage; created: boolean } {
    // Look for existing page with same title
    for (const existing of this.pages.values()) {
      if (existing.title.toLowerCase() === base.title.toLowerCase() && existing.type === base.type) {
        // Merge: append new tags/sources/techniques
        const merged: WikiPage = {
          ...existing,
          tags: [...new Set([...existing.tags, ...base.tags])],
          relatedPages: [...new Set([...existing.relatedPages, ...base.relatedPages])],
          sourceIds: [...new Set([...existing.sourceIds, ...base.sourceIds])],
          attackTechniqueIds: [...new Set([...existing.attackTechniqueIds, ...base.attackTechniqueIds])],
          body: existing.body + '\n\n---\n\n' + base.body,
          updatedAt: new Date(),
          staleness: Math.max(0, existing.staleness - 10), // refresh reduces staleness
          health: 'healthy',
        };
        this.pages.set(existing.id, merged);
        return { page: merged, created: false };
      }
    }

    // Create new
    const page: WikiPage = {
      ...base,
      id: this.generateId('page'),
      createdAt: new Date(),
      updatedAt: new Date(),
      staleness: 0,
      health: 'healthy',
    };
    this.pages.set(page.id, page);
    return { page, created: true };
  }

  // ─── Layer 1 Operations ────────────────────────────────────────────────────

  private cloneRawSource(source: RawSource): RawSource {
    return {
      ...source,
      ingestedAt: new Date(source.ingestedAt.getTime()),
    };
  }

  /**
   * Store a raw source immutably (Layer 1).
   * Returns the stored source (never modified after creation).
   */
  storeRawSource(input: Omit<RawSource, 'id' | 'ingestedAt' | 'contentHash' | 'poisoningRiskScore'>): RawSource {
    const { score } = this.assessPromptInjectionRisk(input.content);
    const source: RawSource = {
      ...input,
      id: this.generateId('raw'),
      ingestedAt: new Date(),
      contentHash: this.simpleHash(input.content),
      poisoningRiskScore: score,
    };
    this.rawSources.set(source.id, source);
    return this.cloneRawSource(source);
  }

  /**
   * Return all raw sources (read-only snapshot).
   */
  listRawSources(): RawSource[] {
    return Array.from(this.rawSources.values(), (source) => this.cloneRawSource(source));
  }

  // ─── Layer 2: Ingest Operation ────────────────────────────────────────────

  /**
   * Ingest a raw source into the wiki.
   * The LLM (simulated here) extracts IOCs, maps to ATT&CK, and updates pages.
   * The raw source is NEVER modified — compounding knowledge grows the wiki.
   */
  ingest(rawSourceId: string): IngestResult {
    const source = this.rawSources.get(rawSourceId);
    if (!source) {
      return {
        rawSourceId,
        pagesCreated: 0,
        pagesUpdated: 0,
        extractedIOCs: [],
        mappedTechniques: [],
        poisoningRiskScore: 0,
        promptInjectionDetected: false,
        warnings: [`Raw source not found: ${rawSourceId}`],
      };
    }

    const warnings: string[] = [];
    const { score: injRisk, detected: injDetected } = this.assessPromptInjectionRisk(source.content);

    if (injDetected) {
      warnings.push('⚠️ Prompt injection patterns detected in source content — wiki updates quarantined for review');
    }

    // Data-poisoning heuristic: if risk > 60 from multiple patterns, flag
    if (injRisk > 60) {
      warnings.push('⚠️ High data-poisoning risk score — manual verification recommended before trusting new pages');
    }

    let pagesCreated = 0;
    let pagesUpdated = 0;

    // Only proceed with full wiki updates when no prompt-injection patterns
    // were detected and the aggregate injection risk remains low.
    const allowFullIngest = !injDetected && injRisk < 50;

    const extractedIOCs = this.extractIOCs(source.content);
    const mappedTechniques = allowFullIngest
      ? this.mapToAttackTechniques(source.content)
      : [];

    if (allowFullIngest) {
      // 1. Create/update technique pages for each mapped ATT&CK technique
      for (const techId of mappedTechniques) {
        const technique = MITRE_TECHNIQUES.find(t => t.id === techId);
        if (!technique) continue;

        const { created } = this.upsertPage({
          type: 'technique',
          title: `${technique.id} — ${technique.name}`,
          summary: technique.description,
          body: `**Tactic:** ${technique.tactic}\n\n**Description:** ${technique.description}\n\n**Observed in:** ${source.title}`,
          tags: ['mitre-attack', technique.tactic.toLowerCase().replace(/ /g, '-'), technique.id],
          relatedPages: [],
          sourceIds: [source.id],
          attackTechniqueIds: [technique.id],
          severity: 'medium',
        });
        if (created) pagesCreated++; else pagesUpdated++;
      }

      // 2. Create IOC pages (one per extracted indicator)
      for (const ioc of extractedIOCs.slice(0, 10)) { // cap page creation per ingest
        const iocType = /^\d{1,3}(\.\d{1,3}){3}$/.test(ioc) ? 'ip'
          : /^[a-f0-9]{32,64}$/i.test(ioc) ? 'hash'
          : ioc.includes('@') ? 'email'
          : 'domain';

        const { created } = this.upsertPage({
          type: 'ioc',
          title: `IOC: ${ioc}`,
          summary: `Indicator of Compromise extracted from: ${source.title}`,
          body: `**Indicator:** \`${ioc}\`\n**Type:** ${iocType}\n**Source:** ${source.title} (${source.type})\n**Ingested:** ${source.ingestedAt.toISOString()}`,
          tags: ['ioc', iocType, source.type.toLowerCase()],
          relatedPages: [],
          sourceIds: [source.id],
          attackTechniqueIds: mappedTechniques,
          severity: 'medium',
        });
        if (created) pagesCreated++; else pagesUpdated++;
      }

      // 3. Create/update a summary page for the source itself
      const summaryPageType = (() => {
        switch (source.type) {
          case 'CVE_NVD_FEED':
          case 'VENDOR_ADVISORY':
            return 'cve';
          case 'IOC_LIST':
          case 'STIX_BUNDLE':
            return 'ioc';
          case 'PENTEST_REPORT':
          case 'RED_TEAM_LOG':
            return 'technique';
          case 'THREAT_INTEL_REPORT':
          case 'OSINT_DUMP':
          default:
            return 'threat-actor';
        }
      })();

      const { created } = this.upsertPage({
        type: summaryPageType,
        title: source.title,
        summary: `Ingested from ${source.origin} on ${source.ingestedAt.toISOString()}`,
        body: `**Source type:** ${source.type}\n**Origin:** ${source.origin}\n\n${source.content.substring(0, 2000)}`,
        tags: [source.type.toLowerCase().replace(/_/g, '-'), 'ingested'],
        relatedPages: [],
        sourceIds: [source.id],
        attackTechniqueIds: mappedTechniques,
        severity: source.type === 'CVE_NVD_FEED' || source.type === 'VENDOR_ADVISORY' ? 'high' : 'medium',
      });
      if (created) pagesCreated++; else pagesUpdated++;
    }

    return {
      rawSourceId,
      pagesCreated,
      pagesUpdated,
      extractedIOCs,
      mappedTechniques,
      poisoningRiskScore: injRisk,
      promptInjectionDetected: injDetected,
      warnings,
    };
  }

  // ─── Layer 3: Query Operation ─────────────────────────────────────────────

  /**
   * Answer a natural language analyst query against the wiki.
   * Optionally files the answer back as a new wiki page (compounding knowledge).
   */
  query(text: string, fileAsPage: boolean = false): WikiQuery {
    const intent = this.classifyIntent(text);
    const { answer, citedPageIds, confidence } = this.answerQuery(text, intent);

    const q: WikiQuery = {
      id: this.generateId('query'),
      text,
      intent,
      answeredAt: new Date(),
      answer,
      citedPageIds,
      confidence,
      filedAsPage: false,
    };

    // File the answer as a new wiki page if requested and confidence is high enough
    if (fileAsPage && confidence >= 60) {
      this.upsertPage({
        type: 'query-result',
        title: `Q: ${text.substring(0, 80)}`,
        summary: `Analyst query answered on ${q.answeredAt.toISOString()}`,
        body: `**Question:** ${text}\n\n**Answer:** ${answer}\n\n**Confidence:** ${confidence}%`,
        tags: ['query-result', intent],
        relatedPages: citedPageIds,
        sourceIds: [],
        attackTechniqueIds: [],
      });
      q.filedAsPage = true;
    }

    this.queryHistory.push(q);
    if (this.queryHistory.length > 500) {
      this.queryHistory = this.queryHistory.slice(-500);
    }

    return q;
  }

  private classifyIntent(text: string): WikiQuery['intent'] {
    const lower = text.toLowerCase();
    if (lower.includes('apt') || lower.includes('actor') || lower.includes('group')) return 'actor-lookup';
    if (lower.includes('ttp') || lower.includes('technique') || lower.includes('tactic')) return 'ttp-search';
    if (lower.includes('cve') || lower.includes('vuln') || lower.includes('patch')) return 'cve-check';
    if (lower.includes('ioc') || lower.includes('indicator') || lower.includes('hash') || lower.includes('domain') || lower.includes('ip')) return 'ioc-search';
    if (lower.includes('landscape') || lower.includes('overview') || lower.includes('trend')) return 'landscape';
    return 'free-form';
  }

  private answerQuery(text: string, intent: WikiQuery['intent']): { answer: string; citedPageIds: string[]; confidence: number } {
    const pages = Array.from(this.pages.values());
    const lower = text.toLowerCase();

    switch (intent) {
      case 'actor-lookup': {
        const actorPages = pages.filter(p => p.type === 'threat-actor');
        const matches = actorPages.filter(p => lower.includes(p.title.toLowerCase().substring(0, 20)));
        if (matches.length > 0) {
          const p = matches[0];
          return {
            answer: `**${p.title}**\n\n${p.summary}\n\n${p.body.substring(0, 600)}\n\n*Linked techniques:* ${p.attackTechniqueIds.join(', ') || 'none'}`,
            citedPageIds: [p.id],
            confidence: 85,
          };
        }
        return {
          answer: `No threat actor pages found matching your query. Try ingesting more threat intelligence reports.`,
          citedPageIds: [],
          confidence: 40,
        };
      }

      case 'ttp-search': {
        const techPages = pages.filter(p => p.type === 'technique');
        const matches = techPages.filter(p =>
          lower.includes(p.title.toLowerCase().substring(0, 20)) ||
          p.attackTechniqueIds.some(id => lower.includes(id.toLowerCase()))
        );
        if (matches.length > 0) {
          const list = matches.slice(0, 5).map(p => `- **${p.title}**: ${p.summary}`).join('\n');
          return { answer: `Found ${matches.length} matching technique(s):\n\n${list}`, citedPageIds: matches.map(p => p.id), confidence: 80 };
        }
        return { answer: 'No technique pages found. Ingest a threat report to populate ATT&CK pages.', citedPageIds: [], confidence: 40 };
      }

      case 'cve-check': {
        const cvePages = pages.filter(p => p.type === 'cve');
        if (cvePages.length > 0) {
          const list = cvePages.slice(0, 5).map(p => `- **${p.title}**: ${p.summary}`).join('\n');
          return { answer: `${cvePages.length} CVE/advisory page(s) in wiki:\n\n${list}`, citedPageIds: cvePages.slice(0, 5).map(p => p.id), confidence: 75 };
        }
        return { answer: 'No CVE pages found. Ingest NVD feed or vendor advisory.', citedPageIds: [], confidence: 40 };
      }

      case 'ioc-search': {
        const iocPages = pages.filter(p => p.type === 'ioc');
        const matches = iocPages.filter(p => {
          const body = p.body.toLowerCase();
          // Try to match actual tokens from the query
          const tokens = lower.split(/\s+/).filter(t => t.length > 4);
          return tokens.some(t => body.includes(t));
        });
        if (matches.length > 0) {
          const list = matches.slice(0, 5).map(p => `- \`${p.title.replace('IOC: ', '')}\`: ${p.summary}`).join('\n');
          return { answer: `Found ${matches.length} matching IOC(s):\n\n${list}`, citedPageIds: matches.map(p => p.id), confidence: 80 };
        }
        if (iocPages.length > 0) {
          return { answer: `${iocPages.length} IOC page(s) exist in the wiki. Narrow your search with a specific indicator.`, citedPageIds: [], confidence: 60 };
        }
        return { answer: 'No IOC pages found. Ingest a threat report or IOC list.', citedPageIds: [], confidence: 40 };
      }

      case 'landscape': {
        const synthesis = this.synthesizeThreatLandscape();
        return {
          answer: synthesis.summary,
          citedPageIds: pages.filter(p => p.type === 'threat-actor' || p.type === 'technique').slice(0, 10).map(p => p.id),
          confidence: 75,
        };
      }

      default: {
        const allText = lower;
        const relevant = pages.filter(p =>
          p.title.toLowerCase().split(' ').some(w => w.length > 3 && allText.includes(w))
        ).slice(0, 5);
        if (relevant.length > 0) {
          const list = relevant.map(p => `- **${p.title}** (${p.type}): ${p.summary}`).join('\n');
          return { answer: `Relevant wiki pages:\n\n${list}`, citedPageIds: relevant.map(p => p.id), confidence: 65 };
        }
        return {
          answer: `No specific wiki pages matched your query. The wiki currently has ${pages.length} page(s). Try ingesting more sources.`,
          citedPageIds: [],
          confidence: 40,
        };
      }
    }
  }

  // ─── Lint / Health Check ──────────────────────────────────────────────────

  /**
   * Automated wiki health pass:
   * - Finds stale CVE entries (patched but still marked open)
   * - Finds orphaned IOC pages (no threat actor linkage)
   * - Detects contradictions between pages
   * Returns a full health report.
   */
  lint(): WikiHealthReport {
    const pages = Array.from(this.pages.values());
    const now = Date.now();
    const contradictions: WikiContradiction[] = [];

    let staleCveCount = 0;
    let orphanedIocCount = 0;

    const pagesBySourceId = new Map<string, typeof pages>();
    for (const indexedPage of pages) {
      for (const sourceId of indexedPage.sourceIds) {
        const sourcePages = pagesBySourceId.get(sourceId);
        if (sourcePages) {
          sourcePages.push(indexedPage);
        } else {
          pagesBySourceId.set(sourceId, [indexedPage]);
        }
      }
    }
    const recordedContradictionPageIds = new Set<string>();

    for (const page of pages) {
      // Age-based staleness: pages older than 30 days without update get +staleness
      const ageMs = now - page.updatedAt.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays > 30) {
        page.staleness = Math.min(100, page.staleness + Math.floor(ageDays / 30) * 15);
        if (page.staleness > 50) page.health = 'stale';
      }

      // Stale CVE: page body mentions "patched" or "fixed" but severity is still high/critical
      if (page.type === 'cve') {
        const bodyLower = page.body.toLowerCase();
        const indicatesPatched = bodyLower.includes('patched') || bodyLower.includes('fixed');
        const severityStillHigh = page.severity === 'high' || page.severity === 'critical';

        if (indicatesPatched && severityStillHigh) {
          staleCveCount++;
          page.staleness = Math.max(page.staleness, 60);
          if (page.health !== 'stale') page.health = 'stale';
        }
      }

      // Orphaned IOC: ioc page with no related threat actor pages
      if (page.type === 'ioc') {
        const hasActorLink = page.relatedPages.some(rid => {
          const related = this.pages.get(rid);
          return related?.type === 'threat-actor';
        });
        if (!hasActorLink) {
          orphanedIocCount++;
          if (page.health === 'healthy') page.health = 'orphaned';
        }
      }

      // Contradiction detection: only compare pages that share one or more source IDs
      if (page.sourceIds.length > 0) {
        const candidatePages = new Map<string, { page: (typeof pages)[number]; sharedSources: Set<string> }>();
        for (const sourceId of page.sourceIds) {
          const sourcePages = pagesBySourceId.get(sourceId);
          if (!sourcePages) continue;
          for (const other of sourcePages) {
            if (other.id === page.id) continue;
            const existingCandidate = candidatePages.get(other.id);
            if (existingCandidate) {
              existingCandidate.sharedSources.add(sourceId);
            } else {
              candidatePages.set(other.id, {
                page: other,
                sharedSources: new Set([sourceId]),
              });
            }
          }
        }

        for (const { page: other, sharedSources } of candidatePages.values()) {
          if (
            sharedSources.size > 0 &&
            page.severity &&
            other.severity &&
            page.severity !== other.severity
          ) {
            const alreadyRecorded =
              recordedContradictionPageIds.has(page.id) || recordedContradictionPageIds.has(other.id);
            if (!alreadyRecorded) {
              contradictions.push({
                pageId: page.id,
                field: 'severity',
                conflictingSourceIds: Array.from(sharedSources),
                description: `"${page.title}" (${page.severity}) contradicts "${other.title}" (${other.severity}) using same source(s)`,
              });
              recordedContradictionPageIds.add(page.id);
              page.health = 'contradicted';
            }
          }
        }
      }

      this.pages.set(page.id, page);
    }

    const healthyPages = pages.filter(p => p.health === 'healthy').length;
    const stalePages = pages.filter(p => p.health === 'stale').length;
    const orphanedPages = pages.filter(p => p.health === 'orphaned').length;
    const contradictedPages = pages.filter(p => p.health === 'contradicted').length;

    const healthScore = pages.length === 0
      ? 100
      : Math.round((healthyPages / pages.length) * 100);

    return {
      generatedAt: new Date(),
      totalPages: pages.length,
      healthyPages,
      stalePages,
      orphanedPages,
      contradictedPages,
      staleCveCount,
      orphanedIocCount,
      contradictions: contradictions.slice(0, 20),
      healthScore,
    };
  }

  // ─── Synthesis ────────────────────────────────────────────────────────────

  /**
   * Auto-maintain the "Threat Landscape" summary page.
   * Replaces the weekly analyst briefing.
   */
  synthesizeThreatLandscape(): ThreatLandscapeSynthesis {
    const pages = Array.from(this.pages.values());

    // Top threat actors by page update recency + source count
    const actorPages = pages
      .filter(p => p.type === 'threat-actor')
      .sort((a, b) => b.sourceIds.length - a.sourceIds.length)
      .slice(0, 5);

    const topActors = actorPages.map(p => ({
      actorName: p.title,
      activityScore: Math.min(100, p.sourceIds.length * 20),
    }));

    // Top techniques by frequency
    const topTechniques = [...this.techniqueFrequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, freq]) => {
        const t = MITRE_TECHNIQUES.find(m => m.id === id);
        return { techniqueId: id, name: t?.name ?? id, frequency: freq };
      });

    // Critical CVEs
    const criticalCVEs = pages
      .filter(p => p.type === 'cve' && p.severity === 'critical')
      .map(p => p.title)
      .slice(0, 5);

    // Emerging threats: high-severity pages created in the last 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const emergingThreats = pages
      .filter(p => p.createdAt.getTime() > sevenDaysAgo && (p.severity === 'high' || p.severity === 'critical'))
      .map(p => p.title)
      .slice(0, 5);

    const summary =
      `**Threat Landscape — ${new Date().toDateString()}**\n\n` +
      `Wiki contains **${pages.length}** pages across ${new Set(pages.map(p => p.type)).size} categories.\n\n` +
      (topActors.length > 0
        ? `**Top threat actors:** ${topActors.map(a => a.actorName).join(', ')}\n\n`
        : '') +
      (topTechniques.length > 0
        ? `**Most observed ATT&CK techniques:** ${topTechniques.map(t => `${t.techniqueId} ${t.name} (×${t.frequency})`).join(', ')}\n\n`
        : '') +
      (criticalCVEs.length > 0
        ? `**Critical CVEs tracked:** ${criticalCVEs.join(', ')}\n\n`
        : '') +
      (emergingThreats.length > 0
        ? `**Emerging threats (last 7 days):** ${emergingThreats.join(', ')}\n\n`
        : '') +
      `*Auto-generated by Karpathy Cyber Wiki synthesis engine.*`;

    // Update or create the persistent threat-landscape page
    this.upsertPage({
      type: 'threat-landscape',
      title: 'Threat Landscape',
      summary: `Auto-maintained threat landscape summary — ${new Date().toDateString()}`,
      body: summary,
      tags: ['synthesis', 'threat-landscape', 'auto-generated'],
      relatedPages: actorPages.map(p => p.id),
      sourceIds: [],
      attackTechniqueIds: topTechniques.map(t => t.techniqueId),
      severity: criticalCVEs.length > 0 ? 'critical' : topActors.length > 0 ? 'high' : 'medium',
    });

    return {
      generatedAt: new Date(),
      topActors,
      topTechniques,
      criticalCVEs,
      emergingThreats,
      summary,
    };
  }

  // ─── AI-BOM ───────────────────────────────────────────────────────────────

  registerAIBOMEntry(entry: Omit<AIBOMEntry, 'lastAuditedAt'>): AIBOMEntry {
    const full: AIBOMEntry = { ...entry, lastAuditedAt: new Date() };
    this.aiBOM.set(entry.componentId, full);
    return full;
  }

  getAIBOM(): AIBOMEntry[] {
    return Array.from(this.aiBOM.values());
  }

  // ─── Read Accessors ───────────────────────────────────────────────────────

  private cloneValue<T>(value: T): T {
    if (value instanceof Date) {
      return new Date(value.getTime()) as T;
    }

    if (Array.isArray(value)) {
      return value.map(item => this.cloneValue(item)) as T;
    }

    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>).map(
        ([key, entryValue]) => [key, this.cloneValue(entryValue)],
      );
      return Object.fromEntries(entries) as T;
    }

    return value;
  }

  getPage(id: string): WikiPage | undefined {
    const page = this.pages.get(id);
    return page ? this.cloneValue(page) : undefined;
  }

  listPages(type?: WikiPageType): WikiPage[] {
    const all = Array.from(this.pages.values());
    const filtered = type ? all.filter(p => p.type === type) : all;
    return filtered.map(page => this.cloneValue(page));
  }

  getQueryHistory(): WikiQuery[] {
    return [...this.queryHistory];
  }

  getMitreTechniques(): MitreTechnique[] {
    return MITRE_TECHNIQUES;
  }

  getStatistics() {
    const pages = Array.from(this.pages.values());
    return {
      totalRawSources: this.rawSources.size,
      totalPages: pages.length,
      threatActorPages: pages.filter(p => p.type === 'threat-actor').length,
      techniquePages: pages.filter(p => p.type === 'technique').length,
      cvePages: pages.filter(p => p.type === 'cve').length,
      iocPages: pages.filter(p => p.type === 'ioc').length,
      queryResultPages: pages.filter(p => p.type === 'query-result').length,
      queriesAnswered: this.queryHistory.length,
      aiBOMEntries: this.aiBOM.size,
    };
  }
}

// Export singleton
export const karpathyCyberWiki = new KarpathyCyberWiki();
