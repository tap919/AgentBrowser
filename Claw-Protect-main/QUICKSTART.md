# Quick Start Guide

> Get Claw Protect running with secure defaults in under 5 minutes.

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | 18 + |
| npm | 9 + |
| Firebase project | Any (free Spark plan works) |
| Google Gemini API key | Required for AI-assisted SOC features |

---

## 1. Clone & Install

```bash
git clone https://github.com/tap919/Claw-Protect.git
cd Claw-Protect
npm ci
```

## 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```dotenv
GEMINI_API_KEY="your-gemini-api-key-here"
APP_URL="http://localhost:3000"
```

> **Security note:** Never commit `.env.local`. It is already in `.gitignore`.

## 3. Secure-Default Configuration

Below is a validated, production-ready default configuration payload that enables the most critical modules with conservative thresholds. Use this as a starting point and adjust per your threat model.

```json
{
  "payloadType": "config",
  "uid": "your-firebase-uid",
  "version": "1.0.0",
  "pricingTier": "starter",
  "modules": {
    "promptInjection": {
      "enabled": true,
      "sensitivity": "high"
    },
    "agentMonitor": {
      "enabled": true,
      "runawayThreshold": 50,
      "runawayWindowMinutes": 5
    },
    "secretsScanner": {
      "enabled": true,
      "autoRedact": true
    },
    "dataExfiltration": {
      "enabled": true,
      "maxTransferBytes": 10485760,
      "trustedDomains": [
        "api.openai.com",
        "api.anthropic.com",
        "generativelanguage.googleapis.com"
      ]
    },
    "zeroTrust": {
      "enabled": true,
      "minTrustScore": 60
    },
    "ransomwareDefense": {
      "enabled": true,
      "backupVerificationInterval": 3600
    }
  },
  "updatedAt": "2026-04-12T00:00:00Z"
}
```

### What This Enables

| Module | What It Does | Default Threshold |
|--------|-------------|-------------------|
| **Prompt Injection** | Blocks 25+ injection patterns including web-based hiding techniques | Sensitivity: high |
| **Agent Monitor** | Detects runaway loops and behavioural drift | 50 actions in 5 min |
| **Secrets Scanner** | Scans for 20+ credential types; auto-redacts in logs | Auto-redact: on |
| **Data Exfiltration** | Monitors outbound transfers; blocks suspicious destinations | Max 10 MB per transfer |
| **Zero Trust** | Dynamic trust scoring; denies access below threshold | Min score: 60/100 |
| **Ransomware Defense** | Monitors file activity for encryption patterns; verifies backups | Backup check: every hour |

## 4. Validate Your Configuration

You can validate your configuration against the JSON Schema:

```bash
# Install a JSON Schema validator (one-time)
npx ajv-cli validate -s schemas/claw-protect-payload.schema.json -d your-config.json
```

## 5. Start the Application

```bash
# Development mode
npm run dev
```

Open your browser to **http://localhost:3000**.

## 6. Enable Multi-Factor Authentication (MFA)

**MFA is mandatory for all users.** You must enroll within 24 hours of account creation.

### 6.1 Enroll MFA with Firebase

1. **Sign in** to the Claw Protect dashboard at http://localhost:3000
2. **Navigate** to Account Settings → Security → Multi-Factor Authentication
3. **Choose a method:**
   - **TOTP (Recommended):** Scan QR code with Google Authenticator or Authy
   - **SMS:** Enter phone number for SMS codes (fallback only)
   - **Hardware token:** Use FIDO2/WebAuthn compatible device (YubiKey, etc.)
4. **Save recovery codes** — 10 single-use codes for account recovery
5. **Verify** — Enter the 6-digit code from your authenticator app

**Alternative: Enable MFA via Firebase Console**

```bash
# Firebase Console > Authentication > Sign-in method > Multi-factor authentication
# Set: "Required" for all users
```

### 6.2 MFA Enforcement Policy

- Accounts without MFA are locked after 24-hour grace period
- Admin actions (config changes, agent revocation) require fresh MFA challenge (<5 min)
- Failed attempts (5+ in 15 min) trigger account lockout + SOC alert

## 7. First-Time Setup Wizard

The dashboard includes a Setup Wizard that walks you through:

1. **Profile selection** — Choose home user, developer, or enterprise
2. **Module configuration** — Enable/disable modules with visual toggles
3. **Auto mode setup** — Configure automated response actions
4. **Summary & launch** — Review and activate your configuration

## 8. Register Your First Agent

```typescript
import {
  agentMonitor,
  zeroTrustManager,
  agentIdentityManager,
} from "@/lib/security";

// 1. Register the agent identity
agentIdentityManager.registerAgent({
  agentId: "my-openclaw-agent",
  publicKey: "your-agent-public-key",
  agentType: "openclaw",
  registeredAt: new Date(),
});

// 2. Create a zero-trust session
const session = zeroTrustManager.createSession({
  sessionId: crypto.randomUUID(),
  agentId: "my-openclaw-agent",
  deviceId: "device-001",
  deviceHealth: "healthy",
  geolocation: { country: "US" },
  ipAddress: "192.168.1.100",
  userAgent: "OpenClaw/1.0",
});

// 3. Start logging activity
agentMonitor.logActivity({
  agentId: "my-openclaw-agent",
  action: "startup",
  resource: "system",
  outcome: "success",
});

console.log("Agent registered. Trust score:", session.trustScore);
```

## 9. Build for Production

```bash
npm run build
```

The production build outputs to `dist/`. Deploy to:

- **Firebase Hosting:** `firebase deploy`
- **Any static host:** Serve the `dist/` directory
- **Docker:** Use the provided multi-stage build (see `Dockerfile` if available)
- **VPS:** Works on a $5/month VPS with Node.js 18+

## 10. Deployment Checklist

- [ ] Environment variables set (`.env.local` or hosting platform secrets)
- [ ] Firebase project configured with Firestore security rules
- [ ] **MFA enabled and enforced for all users**
- [ ] GEMINI_API_KEY is a valid key with billing enabled
- [ ] All 6 default modules enabled (see config above)
- [ ] Trusted domains list reviewed and customised
- [ ] Alert webhook configured (Slack, PagerDuty, or email)
- [ ] Backup verification interval appropriate for your data sensitivity
- [ ] Review `ARCHITECTURE.md` for security posture details

---

## Next Steps

- Read [ARCHITECTURE.md](ARCHITECTURE.md) for full system design
- Read [GLOSSARY.md](GLOSSARY.md) for term definitions
- Read [PROBLEMS.md](PROBLEMS.md) for the 15 security problems addressed
- Explore the [OpenAPI spec](schemas/openapi.yaml) for API integration
- Validate payloads with [JSON Schema](schemas/claw-protect-payload.schema.json)

---

*Need help? Open an issue on [GitHub](https://github.com/tap919/Claw-Protect/issues).*
