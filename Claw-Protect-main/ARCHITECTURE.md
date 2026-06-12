# Claw Protect Architecture

> Version 1.0 — April 2026

This document describes Claw Protect's internal components, data-flow paths, and multi-tenant security posture. It is intended for security reviewers, operators, and contributors.

---

## 1. High-Level Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Claw Protect Control Plane                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐ │
│  │ API Gateway │  │ Detection  │  │ Governance │  │  Dashboard   │ │
│  │  (Express)  │  │  Engine    │  │  Engine    │  │  (React 19)  │ │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └──────┬───────┘ │
│        │               │               │                │         │
│  ┌─────┴───────────────┴───────────────┴────────────────┴───────┐ │
│  │                   Message Bus (in-process)                    │ │
│  └──────────────────────────┬────────────────────────────────────┘ │
│                             │                                      │
│  ┌──────────────────────────┴────────────────────────────────────┐ │
│  │                 Firestore Persistence Layer                    │ │
│  │  /users   /telemetry   /alerts   /configs   /audit_log        │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
         ▲                  ▲                  ▲
         │ (Agent SDK)      │ (Agent SDK)      │ (Agent SDK)
    ┌────┴────┐       ┌────┴────┐        ┌────┴────┐
    │ OpenClaw│       │ Hermes  │        │ Custom  │
    │ Agent   │       │ Agent   │        │ Agent   │
    └─────────┘       └─────────┘        └─────────┘
```

### 1.1 Control Plane

| Component | Responsibility |
|-----------|----------------|
| **API Gateway** | TLS termination, Firebase Auth token validation, rate limiting, idempotency enforcement |
| **Detection Engine** | Runs 20 security modules in parallel against incoming telemetry. Produces alerts and risk scores |
| **Governance Engine** | Compliance policy evaluation, audit log management, credential rotation scheduling |
| **Dashboard** | React 19 SPA with real-time views: Command Center, Analytics, Threat Hunt, Vulnerability Scanner, Playbook Manager |

### 1.2 Agent Fleet

Agents are autonomous AI processes (OpenClaw, Hermes, or custom) that integrate via the Claw Protect SDK. Each agent:

1. Registers with the control plane on startup (receives a session + trust score).
2. Sends telemetry at a configurable interval (default: every 30 s).
3. Receives policy updates and alert notifications via polling or WebSocket.

### 1.3 Gateway Relay

For air-gapped or restricted networks, an optional **Gateway Relay** binary can be deployed inside the private network. It:

- Terminates agent connections locally (mTLS).
- Buffers telemetry in a local WAL (write-ahead log).
- Forwards batched payloads to the control plane over a single outbound TLS 1.3 connection.
- Supports store-and-forward for intermittent connectivity.

---

## 2. Data Flow — Ingress / Egress

### 2.1 Telemetry Ingestion (Ingress)

```
Agent ──TLS 1.3──▶ API Gateway ──validate──▶ Detection Engine
                                                  │
                        ┌─────────────────────────┤
                        ▼                         ▼
                  Firestore /telemetry      Alert Pipeline
                  (append-only, TTL 90d)    ──▶ Firestore /alerts
                                            ──▶ Dashboard push
                                            ──▶ SIEM/SOAR webhook
```

1. Agent SDK serialises a `telemetryPayload` (see `schemas/claw-protect-payload.schema.json`).
2. Payload is sent as `POST /v1/telemetry` with Bearer token + optional `Idempotency-Key`.
3. API Gateway validates the token, checks rate limits, deduplicates.
4. Detection Engine runs all enabled modules against the payload.
5. Results are persisted to Firestore; alerts fan-out to configured sinks.

### 2.2 Alert Delivery (Egress)

```
Detection Engine ──▶ Firestore /alerts ──▶ Dashboard (WebSocket)
                                       ──▶ Webhook (Slack, PagerDuty)
                                       ──▶ SIEM connector (CEF/Syslog)
```

**Data-exfiltration guards for SIEM/SOAR bridging:**

- Outbound webhook payloads are schema-validated before dispatch.
- PII fields are redacted by the DLP module before leaving the control plane.
- Destination domains must be allow-listed in tenant config (`trustedDomains`).
- Each outbound request is logged in `/audit_log` with payload hash, destination, and response status.

**Alert Explainability & Reasoning:**

All new alerts include an optional `reasoning` object that provides transparency into the detection decision:

- **Confidence score** (0-100) indicating detection certainty
- **Detection method** (pattern-matching, ML model, behavioral analysis)
- **Triggered rules** listing specific patterns that matched
- **Evidence chain** showing step-by-step reasoning from observation to conclusion
- **Contributing factors** with normalized weights (e.g., "unusual time: 0.3", "high volume: 0.5")
- **False positive likelihood** estimated from historical data
- **Human guidance** providing plain-language explanation for analysts

> **Note:** The `reasoning` field is optional for backwards compatibility with existing integrations, but is strongly recommended for all new detections and required for compliance with transparency regulations (EU AI Act, etc.).

This explainability framework helps security teams:
1. Validate AI decisions and build trust in automated detections
2. Understand why an alert was raised and how to respond
3. Tune detection thresholds based on reasoning quality
4. Meet compliance requirements for transparent AI systems

### 2.3 Configuration Sync

```
Dashboard ──PUT /v1/config──▶ API Gateway ──▶ Firestore /configs
Agent ──GET /v1/config──▶ API Gateway ──▶ cached config with ETag
```

Config changes are versioned (semver); agents poll with `If-None-Match` for efficient sync.

---

## 3. Security Posture

### 3.1 Encryption

| Layer | Standard | Notes |
|-------|----------|-------|
| **In transit** | TLS 1.3 (agent ↔ gateway ↔ control plane) | Minimum cipher: `TLS_AES_256_GCM_SHA384` |
| **At rest** | AES-256-GCM (Firestore server-side encryption) | Google-managed keys by default; CMEK available for enterprise tier |
| **Post-quantum** | ML-KEM-768 / ML-DSA-65 (optional, via `quantumResistantCrypto` module) | Hybrid mode wraps classical TLS handshake with PQ KEM |

### 3.2 Data Handling & Privacy

| Aspect | Guarantee |
|--------|-----------|
| **Retention** | Telemetry: 90 days (configurable per tier). Alerts: 1 year. Audit logs: 7 years |
| **Deletion** | User-initiated data deletion within 30 days (GDPR Art. 17) |
| **PII minimisation** | Agent IDs are pseudonymous; no personal data required for core operation |
| **Data residency** | See §7 Regional Compliance |

### 3.3 Zero-Trust Architecture

Claw Protect implements zero-trust principles at three levels:

1. **Session level** — Every agent session starts with trust score 50/100. Score adjusts dynamically based on behaviour, device health, and geolocation. Access decisions are re-evaluated on every request.
2. **Module level** — Each security module operates independently with least-privilege access to telemetry data it needs.
3. **Network level** — No implicit trust between control plane and agents. All communication requires mutual authentication.

> **Multi-tenant note:** Tenant data is logically isolated via Firestore security rules (UID-scoped reads/writes). Enterprise tier supports dedicated Firestore databases for physical isolation.

### 3.4 Multi-Factor Authentication (MFA)

MFA is **mandatory** for all human users accessing the Claw Protect control plane. Agents use cryptographic credentials instead of passwords.

| User Type | MFA Requirement | Supported Methods |
|-----------|----------------|-------------------|
| **Admin users** | Required | TOTP (Google Authenticator, Authy), SMS (fallback only), Hardware tokens (FIDO2/WebAuthn) |
| **Read-only users** | Required | TOTP, SMS |
| **Agents (machine identities)** | N/A (use PKI) | Challenge-response with Ed25519/ML-DSA-65 |

**Enforcement policy:**

- MFA enrollment is required within 24 hours of account creation.
- Accounts without MFA are locked after grace period expires.
- MFA recovery codes (10 single-use codes) are generated on enrollment.
- Admin actions (config changes, credential rotation, agent revocation) require fresh MFA challenge (<5 minutes).
- Failed MFA attempts (5+ in 15 minutes) trigger account lockout and alert to SOC.

**Firebase Authentication configuration:**

```javascript
// Enable MFA in Firebase Console > Authentication > Sign-in method > Multi-factor authentication
// On user creation, send an enrollment reminder and start the grace-period workflow.
// Actual enforcement should be handled by your sign-in policy and by step-up checks for privileged actions.
const enforceMFA = functions.auth.user().onCreate(async (user) => {
  if (!user.multiFactor?.enrolledFactors?.length) {
    // Send enrollment reminder email
    // Record grace-period deadline for later lockout if MFA is still not enrolled
  }
});
```

### 3.5 Air-Gap Considerations

For environments that cannot reach the public internet:

- Deploy the Gateway Relay inside the air-gapped network.
- All detection logic runs locally in the relay; only aggregated risk scores are forwarded when connectivity is available.
- Skill and module updates are delivered via signed bundles (see §4.3).

### 3.6 Residual Risk Statement

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Compromise of Firebase admin credentials | Low | Critical | MFA required, credential rotation every 90 days, alert on anomalous admin activity |
| False-negative in prompt injection detection | Medium | High | Continuous fuzzing via `promptFuzzingEngine`, community pattern updates |
| Supply chain attack on Claw Protect dependencies | Low | High | Lockfile pinning, SBOM via `agentDependencyGraph`, Snyk integration |
| Insider threat (admin misuse) | Low | High | Audit logging, dual-approval for config changes in enterprise tier |
| Quantum harvest attack on stored telemetry | Low | Medium | Optional PQ encryption for telemetry at rest (enterprise tier) |

---

## 4. Governance & Auditability

### 4.1 Agent Onboarding / Offboarding

**Onboarding:**
1. Admin creates an agent registration token via dashboard or API.
2. Agent SDK presents the token on first connection → control plane issues a signed session credential (JWT, 1 h TTL, auto-refresh).
3. Agent is recorded in `/agents` collection with metadata and initial trust score.

**Offboarding:**
1. Admin revokes the agent via dashboard → session credential is invalidated immediately.
2. All active sessions for the agent are terminated.
3. Historical telemetry and alerts are retained per retention policy but marked as `decommissioned`.

### 4.2 Credential Rotation

| Credential | Rotation Cadence | Mechanism |
|------------|-----------------|-----------|
| Agent session JWT | 1 hour | Auto-refresh via SDK |
| Firebase service account key | 90 days | Automated rotation via Cloud IAM |
| SIEM webhook signing secret | 90 days | Rotated via `/v1/config` API |
| Post-quantum key pairs | 180 days or on algorithm deprecation | `quantumResistantCrypto.rotateKeys()` |

### 4.3 Skill / Module Signing and Verification

Security modules and skills loaded at runtime follow a cryptographic verification flow:

```
Developer signs module ──Ed25519 signature──▶ Module Registry
                                                  │
Agent downloads module ◀──signed bundle───────────┘
         │
         ▼
SDK verifies signature against pinned public key
         │
    ┌────┴────┐
    │ Valid?  │──No──▶ Reject + alert "supply_chain"
    │         │──Yes─▶ Load module
    └─────────┘
```

- **Signing:** Ed25519 (or ML-DSA-65 for PQ readiness). Developer signs the module hash.
- **Revocation:** A revocation list is checked on every module load. Revoked modules are unloaded immediately.
- **Key rotation:** Module signing keys rotate every 180 days. Old signatures remain valid for a 30-day grace period.

### 4.4 Telemetry Granularity & Access Controls

| Data Category | Granularity | Who Can Access |
|---------------|-------------|----------------|
| Raw telemetry | Per-signal (every 30 s) | Owner (UID), Admin |
| Aggregated metrics | Hourly / daily rollups | Owner, Admin, Read-only viewers |
| Alert details | Per-alert | Owner, Admin |
| Audit logs | Per-action (immutable) | Admin only |
| Configuration | Per-tenant | Owner, Admin |

**Tamper resistance:**
- Audit log entries include a chained SHA-256 hash (each entry references the previous hash).
- Log exports include a HMAC signature for integrity verification.

---

## 5. Compliance & Certification

### 5.1 Standards Alignment

| Standard | Status | Notes |
|----------|--------|-------|
| OWASP Top 10 for LLMs | ✅ Aligned | All 10 categories addressed by at least one module |
| SOC 2 Type II | 🔄 In progress | Controls mapped in `complianceEngine` |
| HIPAA | 🔄 In progress | BAA available for enterprise tier |
| GDPR | ✅ Data-subject rights implemented | Deletion, export, rectification APIs |
| ISO 27001 | 📋 Planned | Control mapping documented |

### 5.2 Privacy-by-Design

- **Data minimisation:** Agents send only security-relevant signals; no raw user content is required.
- **Purpose limitation:** Telemetry is used exclusively for threat detection and compliance.
- **Pseudonymisation:** Agent IDs and user IDs are pseudonymous; correlation requires authenticated access.
- **Data residency:** Firestore region is configurable at project creation (see §7).

### 5.3 Third-Party Audits & Penetration Testing

| Activity | Cadence | Provider |
|----------|---------|----------|
| External penetration test | Annually | Independent third-party (report available under NDA) |
| Automated DAST/SAST | On every PR | CodeQL (SAST), OWASP ZAP (DAST) |
| Dependency vulnerability scan | Daily | Snyk + `agentDependencyGraph` SBOM |
| Red-team exercise | Bi-annually (enterprise) | Internal security team |

### 5.4 CVE Management

1. Dependencies are locked via `package-lock.json`. Renovate/Dependabot monitors for CVEs.
2. Critical CVEs (CVSS ≥ 9.0) are patched within 24 hours.
3. High CVEs (CVSS ≥ 7.0) are patched within 7 days.
4. Medium/Low CVEs are patched in the next scheduled release.
5. CVE status is published in `SECURITY.md` and the GitHub Security tab.

---

## 6. Interoperability & Integrations

### 6.1 API Behaviour

| Aspect | Specification |
|--------|---------------|
| **Rate limits** | Per-tier (see OpenAPI spec `info.description`). Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` |
| **Idempotency** | `Idempotency-Key` header (UUID v4) on POST endpoints. Duplicate requests within 24 h return the original response |
| **Retry / back-off** | Exponential back-off with jitter: initial 1 s, factor 2, max 5 retries, cap 32 s |
| **Pagination** | Cursor-based via `pageToken` / `nextPageToken` |
| **Content type** | `application/json` only; `charset=utf-8` |

### 6.2 SIEM / SOAR Bridging

Claw Protect can forward alerts to external security systems:

- **Webhook:** JSON payload to any HTTPS endpoint (configurable per alert severity).
- **Syslog / CEF:** Alerts formatted in Common Event Format for Splunk, QRadar, ArcSight.
- **SOAR:** Playbook triggers via `playbookEngine` with webhook or API callback.

**Data-exfiltration guards:**
- Outbound payloads are validated against the alert schema before dispatch.
- PII and secrets are redacted by the DLP module.
- Destination allow-list enforced; unapproved destinations are blocked and logged.
- Maximum outbound payload size: 256 KB.

---

## 7. Regional Compliance & Data Residency

| Region | Firestore Location | Applicable Regulation | Notes |
|--------|-------------------|----------------------|-------|
| US | `us-central1` / `us-east1` | SOC 2, CCPA, HIPAA (with BAA) | Default for new projects |
| EU | `europe-west1` / `europe-west3` | GDPR, EU AI Act | Data does not leave the EU |
| APAC | `asia-southeast1` / `australia-southeast1` | PDPA (Singapore), Privacy Act (AU) | Available on enterprise tier |
| Canada | `northamerica-northeast1` | PIPEDA | Available on enterprise tier |

Enterprise customers can select their Firestore region at provisioning time. Cross-region replication is opt-in and encrypted end-to-end.

---

## 8. Module Inventory

| # | Module | Category | Size | Key Capability |
|---|--------|----------|------|----------------|
| 1 | `promptInjectionDetector` | Core | 8.3 KB | 25+ injection patterns |
| 2 | `agentMonitor` | Core | 7.7 KB | Behavioural baselining & drift detection |
| 3 | `secretsScanner` | Core | 8.0 KB | 20+ credential types |
| 4 | `permissionAnalyzer` | Core | 7.4 KB | Least-privilege recommendations |
| 5 | `dataExfiltrationMonitor` | Core | 9.6 KB | Beaconing & rapid-transfer detection |
| 6 | `agentIdentityManager` | Core | 7.2 KB | Challenge-response auth |
| 7 | `toolSupplyChainVerifier` | Core | 8.4 KB | Typosquatting + CVE checking |
| 8 | `approvalRequestValidator` | Core | 9.8 KB | Misleading-summary detection |
| 9 | `shadowAgentDiscovery` | Core | 9.7 KB | Multi-channel agent discovery |
| 10 | `agentUptimeMonitor` | Core | 9.0 KB | Heartbeat & crash tracking |
| 11 | `promptFuzzingEngine` | Extended | 14 KB | Adversarial prompt mutation |
| 12 | `complianceEngine` | Extended | 16 KB | SOC 2 / HIPAA / OWASP controls |
| 13 | `agentDependencyGraph` | Extended | 15 KB | SBOM generation & attack paths |
| 14 | `playbookEngine` | Extended | 15 KB | Automated incident response |
| 15 | `zeroTrustManager` | 2026 Trend | 22 KB | Continuous auth, ITDR |
| 16 | `quantumResistantCrypto` | 2026 Trend | 17 KB | ML-KEM / ML-DSA / SLH-DSA |
| 17 | `ransomwareDefense` | 2026 Trend | 20 KB | Triple-extortion detection |
| 18 | `cloudSecurityManager` | 2026 Trend | 17 KB | Multi-cloud IAM analysis |
| 19 | `iotSecurityManager` | 2026 Trend | 17 KB | Device discovery & firmware verification |
| 20 | `aiAssistedSOC` | 2026 Trend | 20 KB | LLM-powered threat analysis |

---

*Maintained by the Claw Protect team. Last updated: April 2026.*
