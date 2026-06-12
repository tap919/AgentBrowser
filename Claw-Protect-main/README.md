<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Claw Protect 🛡️

**Real-time Security for OpenClaw & Hermes AI Agents**

Claw Protect is a comprehensive, enterprise-hardened security framework inspired by OpenClaw patterns and independently developed to protect AI agents from the 15 most critical vulnerabilities identified in 2026. Built specifically for OpenClaw, Hermes, and similar agentic frameworks running 24/7.

> **Terminology note:** Claw Protect is *not* a fork of OpenClaw. It is an independently developed security layer that integrates with OpenClaw-based and Hermes-based agent deployments. See [GLOSSARY.md](GLOSSARY.md) for canonical definitions.

## 🚨 Why Claw Protect?

AI agent security has been called **the defining cybersecurity challenge of 2026**. The vast majority of individual users and small teams running agents like OpenClaw and Hermes 24/7 are completely unprotected.

- **73%** of enterprise deployments affected by prompt injection
- **86%** success rate for invisible HTML injections
- **7,851%** growth in AI agent traffic in 2025
- **92%** of security professionals concerned about unexpected agent behavior
- **Over 50%** of agents run with zero security oversight

**One compromised agent can:**
- Burn hundreds of dollars in API credits
- Leak credentials and sensitive data
- Execute destructive actions at machine speed
- Compromise entire multi-agent systems

### Cost vs. Benefit
At **$3/month**, the cost of one runaway loop, one leaked API key, or one hijacked agent session far exceeds years of subscription fees.

## ⚡ Quick Start

**Prerequisites:** Node.js 18+

> **Full guide:** See [QUICKSTART.md](QUICKSTART.md) for secure-default configuration, deployment checklist, and first-agent walkthrough.

1. **Install dependencies:**
   ```bash
   npm ci
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env.local
   # Add your GEMINI_API_KEY
   ```

3. **Run the app:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   ```
   http://localhost:3000
   ```

## 🛡️ The 15 Security Protections

Claw Protect addresses all 15 critical security problems:

| # | Problem | Module | Status |
|---|---------|--------|--------|
| 1 | Prompt Injection Attacks | `promptInjectionDetector` | ✅ |
| 2 | Behavioral Drift | `agentMonitor` | ✅ |
| 3 | Exposed API Keys & Secrets | `secretsScanner` | ✅ |
| 4 | Excessive Permissions | `permissionAnalyzer` | ✅ |
| 5 | No Logging/Audit Trail | `agentMonitor` | ✅ |
| 6 | Data Exfiltration | `dataExfiltrationMonitor` | ✅ |
| 7 | Indirect Web Injection | `promptInjectionDetector` | ✅ |
| 8 | Agent Identity Spoofing | `agentIdentityManager` | ✅ |
| 9 | Runaway Loops | `agentMonitor` | ✅ |
| 10 | Supply Chain Poisoning | `toolSupplyChainVerifier` | ✅ |
| 11 | No Anomaly Alerts | `agentMonitor` | ✅ |
| 12 | Misleading Summaries | `approvalRequestValidator` | ✅ |
| 13 | Shadow Agent Deployments | `shadowAgentDiscovery` | ✅ |
| 14 | Resource Exhaustion | `agentUptimeMonitor` | ✅ |
| 15 | Zero Compliance Record | `agentMonitor` | ✅ |

📖 **[Read detailed problem descriptions and solutions →](PROBLEMS.md)**

## 🚀 2026 Cybersecurity Trend Coverage

Claw Protect now addresses the most critical cybersecurity trends for 2026:

| Trend | Module | Coverage |
|-------|--------|----------|
| **Zero Trust Architecture** | `zeroTrustManager` | ✅ Continuous authentication, context-aware access control, dynamic trust scoring, ITDR |
| **Post-Quantum Cryptography** | `quantumResistantCrypto` | ✅ NIST-approved algorithms (ML-KEM, ML-DSA, SLH-DSA), crypto agility, harvest attack detection |
| **Ransomware 3.0 Defense** | `ransomwareDefense` | ✅ Triple extortion detection, operational timing attacks, backup integrity monitoring |
| **Cloud-Native Security** | `cloudSecurityManager` | ✅ Multi-cloud identity federation, IAM analysis, serverless monitoring, container scanning |
| **IoT Security** | `iotSecurityManager` | ✅ Device discovery, firmware verification, anomalous behavior detection, edge security |
| **AI-Assisted SOC** | `aiAssistedSOC` | ✅ LLM-powered threat analysis, automated playbooks, natural language queries |

**Total Security Modules: 20** (14 original + 6 new 2026 trend modules)

## 🔧 Integration Example

```typescript
import {
  // Original modules
  agentMonitor,
  promptInjectionDetector,
  secretsScanner,
  dataExfiltrationMonitor,
  
  // 2026 Trend modules
  zeroTrustManager,
  quantumResistantCrypto,
  ransomwareDefense,
  cloudSecurityManager,
  iotSecurityManager,
  aiAssistedSOC,
} from '@/lib/security';

// Zero Trust: Create session with context
const session = zeroTrustManager.createSession({
  sessionId: 'sess_123',
  agentId: 'openclaw-main',
  deviceId: 'device_456',
  deviceHealth: 'healthy',
  geolocation: { country: 'US' },
  ipAddress: '192.168.1.100',
  userAgent: 'OpenClaw/1.0',
});

// Make access decision based on trust score
const accessDecision = zeroTrustManager.makeAccessDecision({
  sessionId: session.sessionId,
  agentId: session.agentId,
  resource: '/data/sensitive.json',
  action: 'read',
  context: session,
  timestamp: new Date(),
});

console.log('✅ Access granted:', accessDecision.granted);
console.log('🛡️ Trust score:', accessDecision.trustScore);

// Post-Quantum Crypto: Encrypt with quantum-resistant algorithms
const keyPair = quantumResistantCrypto.generateKeyPair('ML-KEM-768');
const encrypted = quantumResistantCrypto.encryptData(
  'sensitive data',
  keyPair.publicKey,
  'ML-KEM-768'
);

// Ransomware Defense: Monitor file activity
ransomwareDefense.logFileActivity({
  agentId: 'openclaw-main',
  path: '/data/important.pdf',
  operation: 'write',
});

// Get emergency response if ransomware detected
const emergency = ransomwareDefense.getEmergencyResponse();
if (emergency.threatLevel === 'critical') {
  console.log('🚨 CRITICAL:', emergency.immediateActions);
}

// Cloud Security: Analyze IAM permissions
const cloudIdentity = cloudSecurityManager.registerCloudIdentity({
  identityId: 'iam_user_123',
  provider: 'aws',
  principalType: 'user',
  principalName: 'agent-user',
  permissions: ['s3:*', 'lambda:InvokeFunction'],
  createdAt: new Date(),
  isActive: true,
});

const iamAnalysis = cloudSecurityManager.getIAMAnalysis(cloudIdentity.identityId);
console.log('⚠️ Risk score:', iamAnalysis?.riskScore);

// IoT Security: Discover and monitor devices
const device = iotSecurityManager.discoverDevice({
  deviceId: 'iot_sensor_001',
  deviceType: 'sensor',
  name: 'Temperature Sensor',
  ipAddress: '192.168.1.200',
  macAddress: '00:11:22:33:44:55',
  protocol: 'mqtt',
  isEncrypted: false,
  isAuthorized: true,
});

// AI-Assisted SOC: Natural language security queries
const nlQuery = aiAssistedSOC.processNaturalLanguageQuery(
  'What are the current critical incidents?'
);
console.log('💬 AI Response:', nlQuery.response);

// Original modules still work
agentMonitor.logActivity({
  agentId: 'openclaw-main',
  action: 'file-read',
  resource: '/data/config.json',
  outcome: 'success'
});

const injectionResult = promptInjectionDetector.detect(userInput);
if (injectionResult.isInjection) {
  console.log('⚠️ Injection detected:', injectionResult.recommendation);
}
```

## 🏗️ Architecture

```
src/lib/security/
├── Core Modules (Problems #1-15)
│   ├── agentMonitor.ts                 # Activity logging, behavioral drift
│   ├── promptInjectionDetector.ts      # Prompt injection detection
│   ├── secretsScanner.ts               # API key & secret scanning
│   ├── permissionAnalyzer.ts           # Permission analysis
│   ├── dataExfiltrationMonitor.ts      # Data transfer monitoring
│   ├── agentIdentityManager.ts         # Inter-agent authentication
│   ├── toolSupplyChainVerifier.ts      # Tool/MCP verification
│   ├── approvalRequestValidator.ts     # Action approval validation
│   ├── shadowAgentDiscovery.ts         # Shadow agent discovery
│   └── agentUptimeMonitor.ts           # Uptime & resource monitoring
│
├── Extended Modules
│   ├── promptFuzzingEngine.ts          # Adversarial testing
│   ├── complianceEngine.ts             # Policy enforcement
│   ├── agentDependencyGraph.ts         # SBOM generation
│   └── playbookEngine.ts               # Incident response automation
│
├── 2026 Trend Modules
│   ├── zeroTrustManager.ts             # Zero Trust architecture
│   ├── quantumResistantCrypto.ts       # Post-quantum cryptography
│   ├── ransomwareDefense.ts            # Ransomware 3.0 protection
│   ├── cloudSecurityManager.ts         # Cloud-native security
│   ├── iotSecurityManager.ts           # IoT & edge security
│   └── aiAssistedSOC.ts                # AI-powered SOC
│
└── index.ts                             # Module exports
```

## 🎯 Built For

### OpenClaw Agents
- Multi-agent orchestration security
- Tool/skill ecosystem verification
- 24/7 autonomous operation monitoring
- Web browsing protection
- Persistent memory audit trails

### Hermes Agents
- Self-improving memory monitoring
- Multi-platform communication tracking
- Scheduled automation safeguards
- Skill learning validation
- Local deployment protection

## 📊 Features

- ✅ **Real-time Monitoring** - Continuous agent activity tracking
- ✅ **Behavioral Baselining** - Learn normal patterns, detect drift
- ✅ **Anomaly Detection** - ML-style pattern recognition
- ✅ **Compliance Logging** - Immutable audit trails
- ✅ **Risk Scoring** - 0-100 scoring for all security dimensions
- ✅ **Automated Alerts** - Severity-based notifications
- ✅ **Forensic Export** - JSON export for investigation
- ✅ **TypeScript** - Full type safety

## 🔐 Security Modules Detail

### Prompt Injection Detector
Detects 20+ injection patterns including role manipulation, delimiter injection, jailbreak attempts, and web-based hiding techniques.

### Agent Monitor
Behavioral baselining, drift detection, runaway loop detection, and comprehensive audit logging.

### Secrets Scanner
Scans for AWS, OpenAI, Anthropic, GitHub tokens and 15+ other credential types with usage tracking.

### Permission Analyzer
Tracks permission usage, identifies unused permissions, generates least-privilege configs.

### Data Exfiltration Monitor
Monitors outbound transfers, detects rapid transfers, beaconing patterns, and suspicious destinations.

### Agent Identity Manager
Challenge-response authentication, trust relationships, spoofing detection for multi-agent setups.

### Tool Supply Chain Verifier
Verifies tool sources, checks vulnerabilities, detects typosquatting with Levenshtein distance.

### Approval Request Validator
Compares summaries to details, detects misleading framing, validates against task scope.

### Shadow Agent Discovery
Discovers unregistered agents, tracks communications, calculates risk scores.

### Uptime Monitor
Heartbeat monitoring, crash tracking, resource usage analysis, uptime percentage calculation.

## 📚 Documentation

- [QUICKSTART.md](QUICKSTART.md) - Quick-start guide with secure defaults and deployment checklist
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture, data flows, security posture, and governance
- [GLOSSARY.md](GLOSSARY.md) - Canonical definitions for all Claw Protect terms
- [PROBLEMS.md](PROBLEMS.md) - Detailed problem descriptions and solutions
- [IMPLEMENTATION.md](IMPLEMENTATION.md) - Technical implementation details
- [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md) - Implementation status checklist
- [schemas/openapi.yaml](schemas/openapi.yaml) - OpenAPI v3 specification
- [schemas/claw-protect-payload.schema.json](schemas/claw-protect-payload.schema.json) - JSON Schema for payloads

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Type checking
npm run lint
```

## 📦 Tech Stack

- **Frontend:** React 19, TypeScript
- **Styling:** Tailwind CSS 4
- **Backend:** Express, Node.js
- **AI:** Google Gemini API
- **Database:** Firebase
- **Security:** Custom modules (see src/lib/security)

## 🚀 Deployment

This app is designed to run alongside your AI agents:

1. **Local Development:** Run on localhost
2. **Self-Hosted:** Deploy to VPS (works on $5/month VPS)
3. **Cloud:** Firebase hosting included

## 📈 Roadmap

- [ ] Real-time dashboard UI integration
- [ ] Webhook notifications (Slack, Discord, Email)
- [ ] Machine learning anomaly detection
- [ ] Multi-tenant support
- [ ] API for external integrations
- [ ] Mobile app for alerts

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines before submitting PRs.

## 📄 License

Apache 2.0

## 🔗 Resources

- [OpenClaw Documentation](https://docs.openclaw.ai/)
- [Hermes Agent](https://hermes-agent.org/)
- [OWASP Top 10 for LLMs](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [BVP: AI Agent Security 2026](https://www.bvp.com/atlas/securing-ai-agents-the-defining-cybersecurity-challenge-of-2026)

---

**Protect your AI agents. Secure your automation. Sleep better.**

View app in AI Studio: https://ai.studio/apps/9f59d533-2129-4ef5-b0b0-12abb871c925
