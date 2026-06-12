/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Secrets Scanner - Addresses Problem #3: Exposed API Keys & Secrets
// Scans for exposed credentials and monitors unusual credential usage

export interface SecretMatch {
  type: string;
  value: string; // Partially redacted
  location: string;
  line?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence?: number;
  redacted?: string;
}

interface ScanSecretResult {
  type: string;
  value: string;
  redacted: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
}

interface LegacyScanResult {
  found: boolean;
  secrets: ScanSecretResult[];
}

export interface CredentialUsage {
  credentialId: string;
  service: string;
  timestamp: Date;
  location: string;
  isUnusual: boolean;
  reason?: string;
}

class SecretsScanner {
  // Problem #3: Exposed API Keys & Secrets
  private secretPatterns = [
    // AWS
    { 
      type: 'AWS Access Key',
      pattern: /AKIA[0-9A-Z]{16}/g,
      severity: 'critical' as const
    },
    {
      type: 'AWS Secret Key',
      pattern: /aws(.{0,20})?['\"][0-9a-zA-Z\/+]{40}['\"]/gi,
      severity: 'critical' as const
    },
    
    // API Keys (Generic)
    {
      type: 'Generic API Key',
      pattern: /api[_-]?key['\"]?\s*[:=]\s*['\"]?[a-zA-Z0-9]{20,}['\"]?/gi,
      severity: 'high' as const
    },
    {
      type: 'API Secret',
      pattern: /api[_-]?secret['\"]?\s*[:=]\s*['\"]?[a-zA-Z0-9]{20,}['\"]?/gi,
      severity: 'high' as const
    },
    
    // Google API
    {
      type: 'Google API Key',
      pattern: /AIza[0-9A-Za-z\-_]{35}/g,
      severity: 'critical' as const
    },
    
    // OpenAI
    {
      type: 'OpenAI API Key',
      pattern: /sk-[a-zA-Z0-9]{48}/g,
      severity: 'critical' as const
    },
    
    // Anthropic
    {
      type: 'Anthropic API Key',
      pattern: /sk-ant-[a-zA-Z0-9\-]{95}/g,
      severity: 'critical' as const
    },
    
    // GitHub
    {
      type: 'GitHub Token',
      pattern: /gh[pousr]_[0-9a-zA-Z]{36}/g,
      severity: 'critical' as const
    },
    {
      type: 'GitHub Personal Access Token',
      pattern: /ghp_[0-9a-zA-Z]{36}/g,
      severity: 'critical' as const
    },
    
    // Slack
    {
      type: 'Slack Token',
      pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,32}/g,
      severity: 'high' as const
    },
    
    // JWT Tokens
    {
      type: 'JWT Token',
      pattern: /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g,
      severity: 'medium' as const
    },
    
    // Private Keys
    {
      type: 'RSA Private Key',
      pattern: /-----BEGIN RSA PRIVATE KEY-----/g,
      severity: 'critical' as const
    },
    {
      type: 'SSH Private Key',
      pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/g,
      severity: 'critical' as const
    },
    
    // Database URLs
    {
      type: 'MongoDB Connection String',
      pattern: /mongodb(\+srv)?:\/\/[^\s]{20,}/g,
      severity: 'critical' as const
    },
    {
      type: 'PostgreSQL Connection String',
      pattern: /postgres(ql)?:\/\/[^\s]{20,}/g,
      severity: 'critical' as const
    },
    
    // Passwords in code
    {
      type: 'Password in Code',
      pattern: /password['\"]?\s*[:=]\s*['\"][^'\"]{8,}['\"]/gi,
      severity: 'high' as const
    },
    
    // Bearer Tokens
    {
      type: 'Bearer Token',
      pattern: /bearer\s+[a-zA-Z0-9\-._~+\/]{20,}/gi,
      severity: 'medium' as const
    },
  ];

  private credentialUsageHistory: CredentialUsage[] = [];
  private knownCredentials: Map<string, { service: string; locations: Set<string> }> = new Map();

  /**
   * Comprehensive secret detection patterns derived from Gitleaks ruleset.
   * Covers 60+ credential types across all major cloud, SaaS, and infra providers.
   * Ordered with highest-specificity patterns first to prevent false sub-matches.
   */
  private legacyPatterns = [
    // ── Anthropic ─────────────────────────────────────────────────────────────
    { type: 'anthropic_api_key', regex: /sk-ant-[A-Za-z0-9_-]{20,}/g, severity: 'critical' as const, confidence: 97 },

    // ── OpenAI ────────────────────────────────────────────────────────────────
    { type: 'openai_api_key', regex: /sk-(?:proj-)[A-Za-z0-9_-]{24,}/g, severity: 'critical' as const, confidence: 99 },
    { type: 'openai_api_key', regex: /sk-[A-Za-z0-9_-]{48}/g, severity: 'critical' as const, confidence: 97 },

    // ── AWS ───────────────────────────────────────────────────────────────────
    { type: 'aws_access_key', regex: /AKIA[0-9A-Z]{16}/g, severity: 'critical' as const, confidence: 99 },
    { type: 'aws_secret_key', regex: /(?:aws_secret_access_key|secret[:=]\s*)[^\n\r]*?([A-Za-z0-9\/+=]{40})/gi, severity: 'critical' as const, confidence: 96 },

    // ── GitHub ────────────────────────────────────────────────────────────────
    { type: 'github_pat',          regex: /ghp_[A-Za-z0-9]{36,}/g,         severity: 'critical' as const, confidence: 99 },
    { type: 'github_oauth',        regex: /gho_[A-Za-z0-9]{35,}/g,         severity: 'critical' as const, confidence: 99 },
    { type: 'github_app_token',    regex: /ghu_[A-Za-z0-9]{36,}/g,         severity: 'critical' as const, confidence: 99 },
    { type: 'github_refresh_token',regex: /ghr_[A-Za-z0-9]{76}/g,          severity: 'critical' as const, confidence: 99 },
    { type: 'github_server_token', regex: /ghs_[A-Za-z0-9]{36,}/g,         severity: 'critical' as const, confidence: 99 },

    // ── Google ────────────────────────────────────────────────────────────────
    { type: 'google_api_key',       regex: /AIza[0-9A-Za-z\-_]{35}/g,      severity: 'critical' as const, confidence: 96 },
    { type: 'google_oauth_client',  regex: /[0-9]+-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com/g, severity: 'high' as const, confidence: 90 },
    { type: 'gcp_service_account',  regex: /"type"\s*:\s*"service_account"/g, severity: 'critical' as const, confidence: 95 },

    // ── Stripe ────────────────────────────────────────────────────────────────
    { type: 'stripe_secret_key',      regex: /sk_live_[0-9a-zA-Z]{24,}/g,   severity: 'critical' as const, confidence: 99 },
    { type: 'stripe_restricted_key',  regex: /rk_live_[0-9a-zA-Z]{24,}/g,   severity: 'critical' as const, confidence: 99 },
    { type: 'stripe_publishable_key', regex: /pk_live_[0-9a-zA-Z]{24,}/g,   severity: 'high'     as const, confidence: 95 },
    { type: 'stripe_test_key',        regex: /sk_test_[0-9a-zA-Z]{24,}/g,   severity: 'medium'   as const, confidence: 90 },

    // ── Slack ─────────────────────────────────────────────────────────────────
    { type: 'slack_bot_token',   regex: /xoxb-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,32}/g, severity: 'high' as const, confidence: 98 },
    { type: 'slack_user_token',  regex: /xoxp-[0-9]{10,13}-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{32}/g, severity: 'high' as const, confidence: 98 },
    { type: 'slack_app_token',   regex: /xapp-1-[A-Z0-9]{10,13}-[0-9]{11,13}-[a-zA-Z0-9]{64}/g, severity: 'high' as const, confidence: 98 },
    { type: 'slack_config_token',regex: /xoxe\.[0-9a-z]+-1-[0-9a-z]+-[0-9a-z]+-[0-9a-z]+-[0-9a-z]+-[0-9a-z]+-[0-9a-z]+/g, severity: 'high' as const, confidence: 95 },
    { type: 'slack_webhook',     regex: /https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]{9,10}\/[A-Z0-9]{9,11}\/[a-zA-Z0-9]{24}/g, severity: 'high' as const, confidence: 99 },

    // ── Twilio ────────────────────────────────────────────────────────────────
    { type: 'twilio_account_sid',  regex: /AC[a-zA-Z0-9]{32}/g, severity: 'high' as const, confidence: 85 },
    { type: 'twilio_auth_token',   regex: /(?:TWILIO_AUTH_TOKEN|twilio.*auth_token|twilio.*token)\s*[=:]\s*["']?([a-zA-Z0-9]{32})["']?/gi, severity: 'critical' as const, confidence: 95 },

    // ── SendGrid ──────────────────────────────────────────────────────────────
    { type: 'sendgrid_api_key', regex: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g, severity: 'high' as const, confidence: 99 },

    // ── Mailchimp ─────────────────────────────────────────────────────────────
    { type: 'mailchimp_api_key', regex: /[0-9a-f]{32}-us[0-9]{1,2}/g, severity: 'high' as const, confidence: 90 },

    // ── Shopify ───────────────────────────────────────────────────────────────
    { type: 'shopify_access_token',  regex: /shpat_[a-fA-F0-9]{32}/g, severity: 'critical' as const, confidence: 99 },
    { type: 'shopify_custom_token',  regex: /shpca_[a-fA-F0-9]{32}/g, severity: 'critical' as const, confidence: 99 },
    { type: 'shopify_partner_token', regex: /shppa_[a-fA-F0-9]{32}/g, severity: 'critical' as const, confidence: 99 },
    { type: 'shopify_shared_secret', regex: /shpss_[a-fA-F0-9]{32}/g, severity: 'critical' as const, confidence: 99 },

    // ── Square ────────────────────────────────────────────────────────────────
    { type: 'square_access_token',  regex: /EAAA[a-zA-Z0-9]{60}/g,          severity: 'critical' as const, confidence: 99 },
    { type: 'square_oauth_secret',  regex: /sq0[a-z]{3}-[0-9A-Za-z\-_]{22,43}/g, severity: 'critical' as const, confidence: 95 },

    // ── NPM / Node ────────────────────────────────────────────────────────────
    { type: 'npm_access_token', regex: /npm_[A-Za-z0-9]{36}/g, severity: 'critical' as const, confidence: 99 },

    // ── HashiCorp Vault ───────────────────────────────────────────────────────
    { type: 'hashicorp_vault_token', regex: /hvs\.[A-Za-z0-9_-]{90,110}/g, severity: 'critical' as const, confidence: 99 },
    { type: 'hashicorp_vault_batch', regex: /hvb\.[A-Za-z0-9_-]{90,110}/g, severity: 'critical' as const, confidence: 99 },

    // ── Cloudflare ────────────────────────────────────────────────────────────
    { type: 'cloudflare_api_token', regex: /[A-Za-z0-9_-]{40}/g,            severity: 'high'   as const, confidence: 60 }, // low specificity — needs context
    { type: 'cloudflare_global_key', regex: /(?:cloudflare|CF_API_KEY)\s*[=:]\s*["']?([a-zA-Z0-9]{37})["']?/gi, severity: 'critical' as const, confidence: 90 },

    // ── Datadog ───────────────────────────────────────────────────────────────
    { type: 'datadog_api_key', regex: /(?:DD_API_KEY|DATADOG_API_KEY)\s*[=:]\s*["']?([a-zA-Z0-9]{32})["']?/gi, severity: 'high' as const, confidence: 92 },
    { type: 'datadog_app_key', regex: /(?:DD_APP_KEY|DATADOG_APP_KEY)\s*[=:]\s*["']?([a-zA-Z0-9]{40})["']?/gi, severity: 'high' as const, confidence: 92 },

    // ── New Relic ─────────────────────────────────────────────────────────────
    { type: 'new_relic_api_key',   regex: /NRAK-[A-Z0-9]{27}/g, severity: 'high' as const, confidence: 99 },
    { type: 'new_relic_ingest_key',regex: /NRII-[A-Za-z0-9_-]{32}/g, severity: 'high' as const, confidence: 99 },
    { type: 'new_relic_license',   regex: /[A-Za-z0-9]{32}NRAL/g, severity: 'high' as const, confidence: 99 },

    // ── PagerDuty ─────────────────────────────────────────────────────────────
    { type: 'pagerduty_integration_key', regex: /(?:pagerduty|PD)\w*[_-]?(?:key|token|secret)\s*[=:]\s*["']?([a-zA-Z0-9+/]{20,32})["']?/gi, severity: 'high' as const, confidence: 80 },

    // ── Okta ─────────────────────────────────────────────────────────────────
    { type: 'okta_api_token', regex: /00[A-Za-z0-9_-]{40}/g, severity: 'critical' as const, confidence: 85 },

    // ── HubSpot ───────────────────────────────────────────────────────────────
    { type: 'hubspot_api_key', regex: /pat-[a-z]{2}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, severity: 'high' as const, confidence: 99 },
    { type: 'hubspot_legacy_key',  regex: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, severity: 'medium' as const, confidence: 60 },

    // ── Discord ───────────────────────────────────────────────────────────────
    { type: 'discord_bot_token',   regex: /[MN][A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}/g, severity: 'critical' as const, confidence: 85 },
    { type: 'discord_webhook',     regex: /https:\/\/discord(?:app)?\.com\/api\/webhooks\/[0-9]{17,19}\/[A-Za-z0-9_-]{68}/g, severity: 'high' as const, confidence: 99 },
    { type: 'discord_client_secret', regex: /(?:discord.*secret|DISCORD_CLIENT_SECRET)\s*[=:]\s*["']?([a-zA-Z0-9_-]{32})["']?/gi, severity: 'high' as const, confidence: 90 },

    // ── Telegram ──────────────────────────────────────────────────────────────
    { type: 'telegram_bot_token', regex: /[0-9]{8,10}:[A-Za-z0-9_-]{35}/g, severity: 'high' as const, confidence: 95 },

    // ── Firebase ─────────────────────────────────────────────────────────────
    { type: 'firebase_config', regex: /AIza[0-9A-Za-z-_]{35}/g, severity: 'high' as const, confidence: 90 }, // Firebase shares prefix with Google API key
    { type: 'firebase_database_url', regex: /https:\/\/[a-zA-Z0-9-]+\.firebaseio\.com/g, severity: 'medium' as const, confidence: 85 },

    // ── Supabase ──────────────────────────────────────────────────────────────
    { type: 'supabase_service_role', regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, severity: 'high' as const, confidence: 70 },

    // ── Vercel ────────────────────────────────────────────────────────────────
    { type: 'vercel_token', regex: /vercel.*token\s*[=:]\s*["']?([A-Za-z0-9_-]{24,64})["']?/gi, severity: 'high' as const, confidence: 85 },

    // ── Heroku ────────────────────────────────────────────────────────────────
    { type: 'heroku_api_key', regex: /(?:heroku.*(?:api_key|token|secret))\s*[=:]\s*["']?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})["']?/gi, severity: 'high' as const, confidence: 90 },

    // ── Atlassian / Jira / Confluence ─────────────────────────────────────────
    { type: 'atlassian_api_token', regex: /(?:atlassian|jira|confluence).*token\s*[=:]\s*["']?([A-Za-z0-9+/]{24,40})["']?/gi, severity: 'high' as const, confidence: 85 },

    // ── Azure ─────────────────────────────────────────────────────────────────
    { type: 'azure_client_secret', regex: /(?:AZURE_CLIENT_SECRET|azure.*client_secret)\s*[=:]\s*["']?([A-Za-z0-9~._-]{34,40})["']?/gi, severity: 'critical' as const, confidence: 92 },
    { type: 'azure_sas_token', regex: /sig=[A-Za-z0-9%+/]{40,200}/g, severity: 'high' as const, confidence: 80 },
    { type: 'azure_storage_key', regex: /DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[A-Za-z0-9+/]{86}==/g, severity: 'critical' as const, confidence: 99 },

    // ── DigitalOcean ──────────────────────────────────────────────────────────
    { type: 'digitalocean_personal_token', regex: /dop_v1_[a-zA-Z0-9]{64}/g, severity: 'critical' as const, confidence: 99 },
    { type: 'digitalocean_oauth_token',    regex: /doo_v1_[a-zA-Z0-9]{64}/g, severity: 'critical' as const, confidence: 99 },
    { type: 'digitalocean_refresh_token',  regex: /dor_v1_[a-zA-Z0-9]{64}/g, severity: 'critical' as const, confidence: 99 },

    // ── Private Keys / Certificates ───────────────────────────────────────────
    { type: 'rsa_private_key',    regex: /-----BEGIN RSA PRIVATE KEY-----/g,     severity: 'critical' as const, confidence: 100 },
    { type: 'ssh_private_key',    regex: /-----BEGIN OPENSSH PRIVATE KEY-----/g, severity: 'critical' as const, confidence: 100 },
    { type: 'pgp_private_key',    regex: /-----BEGIN PGP PRIVATE KEY BLOCK-----/g, severity: 'critical' as const, confidence: 100 },
    { type: 'ec_private_key',     regex: /-----BEGIN EC PRIVATE KEY-----/g,      severity: 'critical' as const, confidence: 100 },

    // ── Database URLs ─────────────────────────────────────────────────────────
    { type: 'mongodb_connection', regex: /mongodb(?:\+srv)?:\/\/[^\s"']{20,}/g, severity: 'critical' as const, confidence: 95 },
    { type: 'postgres_connection',regex: /postgres(?:ql)?:\/\/[^\s"']{20,}/g,   severity: 'critical' as const, confidence: 95 },
    { type: 'mysql_connection',   regex: /mysql:\/\/[^\s"']{20,}/g,             severity: 'critical' as const, confidence: 95 },
    { type: 'redis_connection',   regex: /redis:\/\/[^\s"']{20,}/g,             severity: 'high'     as const, confidence: 90 },

    // ── JWT ───────────────────────────────────────────────────────────────────
    { type: 'jwt_token', regex: /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, severity: 'medium' as const, confidence: 85 },
  ];

  /**
   * Scan text content for exposed secrets
   */
  scanText(content: string, location: string = 'unknown'): SecretMatch[] {
    const matches: SecretMatch[] = [];

    for (const { type, pattern, severity } of this.secretPatterns) {
      const regex = new RegExp(pattern);
      let match;
      
      // Split content into lines for line number tracking
      const lines = content.split('\n');
      
      lines.forEach((line, lineIndex) => {
        regex.lastIndex = 0; // Reset regex
        while ((match = regex.exec(line)) !== null) {
          matches.push({
            type,
            value: this.redactSecret(match[0]),
            location,
            line: lineIndex + 1,
            severity,
          });
        }
      });
    }

    return matches;
  }

  /**
   * Scan a file for secrets
   */
  scanFile(filePath: string, content: string): SecretMatch[] {
    return this.scanText(content, filePath);
  }

  /**
   * Batch scan multiple files
   */
  batchScan(files: Array<{ path: string; content: string }>): Map<string, SecretMatch[]> {
    const results = new Map<string, SecretMatch[]>();
    
    for (const file of files) {
      const matches = this.scanFile(file.path, file.content);
      if (matches.length > 0) {
        results.set(file.path, matches);
      }
    }
    
    return results;
  }

  /**
   * Partially redact secret for display
   */
  private redactSecret(secret: string): string {
    if (secret.length <= 8) {
      return '***';
    }
    const visibleChars = Math.min(4, Math.floor(secret.length * 0.2));
    const start = secret.substring(0, visibleChars);
    const end = secret.substring(secret.length - visibleChars);
    return `${start}...${end}`;
  }

  /**
   * Log credential usage and detect unusual patterns
   */
  logCredentialUsage(credentialId: string, service: string, location: string): CredentialUsage {
    const usage: CredentialUsage = {
      credentialId,
      service,
      timestamp: new Date(),
      location,
      isUnusual: false,
    };

    // Check if this credential is being used from an unusual location
    const known = this.knownCredentials.get(credentialId);
    if (known) {
      if (!known.locations.has(location)) {
        usage.isUnusual = true;
        usage.reason = `Credential used from new location: ${location}. Known locations: ${Array.from(known.locations).join(', ')}`;
      }
      known.locations.add(location);
    } else {
      // First time seeing this credential
      this.knownCredentials.set(credentialId, {
        service,
        locations: new Set([location]),
      });
    }

    this.credentialUsageHistory.push(usage);

    // Limit history size
    if (this.credentialUsageHistory.length > 5000) {
      this.credentialUsageHistory = this.credentialUsageHistory.slice(-5000);
    }

    return usage;
  }

  /**
   * Get unusual credential usage alerts
   */
  getUnusualUsage(limit: number = 50): CredentialUsage[] {
    return this.credentialUsageHistory
      .filter(u => u.isUnusual)
      .slice(-limit)
      .reverse();
  }

  /**
   * Detect if credentials are being used at an unusual rate (potential exfiltration)
   */
  detectCredentialExfiltration(credentialId: string, timeWindowMinutes: number = 5): boolean {
    const windowStart = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    const recentUsage = this.credentialUsageHistory.filter(
      u => u.credentialId === credentialId && u.timestamp >= windowStart
    );

    // Alert if same credential used more than 10 times in short window
    return recentUsage.length > 10;
  }

  /**
   * Generate security report
   */
  generateReport(): {
    totalScans: number;
    secretsFound: number;
    criticalSecrets: number;
    unusualUsage: number;
    recommendations: string[];
  } {
    const allUsage = this.credentialUsageHistory;
    const unusualCount = allUsage.filter(u => u.isUnusual).length;
    
    const recommendations: string[] = [];
    
    if (unusualCount > 0) {
      recommendations.push('Review unusual credential usage patterns');
    }
    
    if (this.knownCredentials.size > 50) {
      recommendations.push('Consider implementing credential rotation');
    }

    recommendations.push('Use environment variables for all secrets');
    recommendations.push('Enable secret scanning in CI/CD pipeline');
    recommendations.push('Implement least-privilege access for all credentials');

    return {
      totalScans: allUsage.length,
      secretsFound: this.knownCredentials.size,
      criticalSecrets: 0, // Would track from scan results
      unusualUsage: unusualCount,
      recommendations,
    };
  }

  scan(content: string): LegacyScanResult {
    if (!content) {
      return { found: false, secrets: [] };
    }

    const secrets: ScanSecretResult[] = [];
    // Track seen (type, value) pairs to avoid duplicates when multiple patterns match the same token
    const seen = new Set<string>();

    for (const pattern of this.legacyPatterns) {
      const regex = new RegExp(pattern.regex);
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        const rawValue = match[1] || match[0];
        if (this.isPlaceholder(rawValue, pattern.type)) {
          continue;
        }
        const dedupeKey = `${pattern.type}:${rawValue}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        secrets.push({
          type: pattern.type,
          value: rawValue,
          redacted: this.redactForLegacy(rawValue),
          severity: pattern.severity,
          confidence: pattern.confidence,
        });
      }
    }

    const highEntropyMatches = this.findHighEntropySecrets(content);
    for (const value of highEntropyMatches) {
      if (this.isPlaceholder(value)) continue;
      // Skip if already captured by a named pattern
      const alreadyCaught = secrets.some(s => s.value === value || s.value.includes(value));
      if (alreadyCaught) continue;
      const dedupeKey = `high_entropy:${value}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      secrets.push({
        type: 'high_entropy',
        value,
        redacted: this.redactForLegacy(value),
        severity: value.length >= 32 ? 'high' : 'medium',
        confidence: 75,
      });
    }

    return {
      found: secrets.length > 0,
      secrets,
    };
  }

  private redactForLegacy(secret: string): string {
    if (secret.length <= 8) return '****';
    return `${secret.slice(0, 4)}****${secret.slice(-4)}`;
  }

  private isPlaceholder(value: string, type?: string): boolean {
    const upper = value.toUpperCase();
    if (upper.includes('YOUR_') || upper.includes('PLACEHOLDER')) {
      return true;
    }
    if ((type === 'aws_access_key' || type === 'aws_secret_key') && upper.includes('EXAMPLE')) {
      return false;
    }
    return upper.includes('EXAMPLE') && !value.startsWith('AKIA');
  }

  private findHighEntropySecrets(content: string): string[] {
    const candidates = content.match(/[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]{24,}/g) || [];
    return candidates.filter(candidate => {
      const unique = new Set(candidate).size;
      const ratio = unique / candidate.length;
      return ratio > 0.45 && /[A-Z]/.test(candidate) && /[a-z]/.test(candidate) && /\d|[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]/.test(candidate);
    });
  }
}

// Singleton instance
export const secretsScanner = new SecretsScanner();
