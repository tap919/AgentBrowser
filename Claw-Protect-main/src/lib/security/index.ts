/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Security Module Exports
// Comprehensive security framework for OpenClaw/Hermes AI agents

// Problem #1, #7: Prompt Injection Detection
export * from './promptInjectionDetector';

// Problem #2, #5, #9, #11, #15: Agent Activity Monitoring & Audit Trails
export * from './agentMonitor';

// Problem #3: API Keys & Secrets Scanning
export * from './secretsScanner';

// Problem #4: Permission Analysis & Least Privilege
export * from './permissionAnalyzer';

// Problem #6: Data Exfiltration Monitoring
export * from './dataExfiltrationMonitor';

// Problem #8: Inter-Agent Identity Verification
export * from './agentIdentityManager';

// Problem #10: Supply Chain / MCP Tool Verification
export * from './toolSupplyChainVerifier';

// Problem #12: Approval Request Validation
export * from './approvalRequestValidator';

// Problem #13: Shadow Agent Discovery
export * from './shadowAgentDiscovery';

// Problem #14: Uptime Monitoring & Resource Exhaustion
export * from './agentUptimeMonitor';

// ─── Extended Modules — Inspired by Industry Leaders ──────────────────────────

// Prompt Fuzzing Engine — inspired by msoedov/agentic-security
// Dynamic prompt mutation & adversarial testing (ROT13, base64, homoglyphs, etc.)
export * from './promptFuzzingEngine';

// Compliance & Guardrails Engine — inspired by Cisco AI Defense
// Policy enforcement, SOC2/HIPAA/OWASP controls, composite risk scoring
export * from './complianceEngine';

// Agent Dependency Graph & SBOM — inspired by agentic-radar + Snyk
// Tool/MCP/model dependency mapping, attack path detection, SBOM generation
export * from './agentDependencyGraph';

// Security Playbook / SOAR Engine — inspired by Tracecat
// Automated incident response workflows, case management, human-in-the-loop
export * from './playbookEngine';

// ─── 2026 Cybersecurity Trends — Critical Gap Modules ─────────────────────────

// Zero Trust Architecture — 2026 Trend: Identity-First Security
// Continuous authentication, context-aware access control, dynamic trust scoring, ITDR
export * from './zeroTrustManager';

// Post-Quantum Cryptography — 2026 Trend: Quantum-Resistant Security
// NIST-approved algorithms (ML-KEM, ML-DSA, SLH-DSA), crypto agility, harvest attack detection
export * from './quantumResistantCrypto';

// Advanced Ransomware Defense — 2026 Trend: Ransomware 3.0
// Triple extortion detection, operational timing attacks, backup integrity monitoring
export * from './ransomwareDefense';

// Cloud-Native Security Manager — 2026 Trend: Cloud Security & Continuous Monitoring
// Multi-cloud identity federation, IAM analysis, serverless monitoring, container security
export * from './cloudSecurityManager';

// IoT Security Manager — 2026 Trend: IoT & Expanding Attack Surface
// IoT device discovery, firmware verification, anomalous behavior detection, edge security
export * from './iotSecurityManager';

// AI-Assisted SOC — 2026 Trend: Workforce & Skills Gap
// LLM-powered threat analysis, automated playbook generation, natural language queries
export * from './aiAssistedSOC';

// State Management — Resilience & Reliability
// Agent state checkpointing & rollback for preventing cascading failures
export * from './stateManager';

// Karpathy Cyber Wiki — LLM-as-Compiler Threat Knowledge Base
// Three-layer architecture (Raw Sources → Wiki → Query), MITRE ATT&CK integration,
// ingest/query/lint/synthesize operations, prompt-injection & data-poisoning guards
export * from './karpathyCyberWiki';

