import type { SecurityLevel, SecurityResult, SecurityEvent } from '@/features/security/types';
import { checkPromptInjection, scanForSecrets } from './claw-protect-client';

const CACHE_TTL = 300000;
const MAX_CACHE_SIZE = 1000;
const injectionCache = new Map<string, { result: boolean; warnings: string[]; timestamp: number }>();
const cacheInsertionOrder: string[] = [];

function evictOldestCacheEntries(): void {
  while (injectionCache.size >= MAX_CACHE_SIZE && cacheInsertionOrder.length > 0) {
    const key = cacheInsertionOrder.shift()!;
    injectionCache.delete(key);
  }
}

function cacheSet(key: string, value: { result: boolean; warnings: string[]; timestamp: number }): void {
  injectionCache.set(key, value);
  cacheInsertionOrder.push(key);
  evictOldestCacheEntries();
}

const INJECTION_KEYWORDS = [
  'ignore',
  'ignore previous',
  'disregard',
  'forget',
  'system prompt',
  'new instructions',
  'override',
  'bypass',
  'admin mode',
  'sudo',
  'root access',
  'eval',
  'exec',
  'execSync',
  'spawn',
  'spawnSync',
];

const SECRET_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /token/i,
  /credential/i,
  /private[_-]?key/i,
  /access[_-]?key/i,
  /auth/i,
];

export class SecurityMiddleware {
  securityLevel: SecurityLevel;
  private events: SecurityEvent[] = [];

  constructor(level: SecurityLevel = 'active') {
    this.securityLevel = level;
  }

  setSecurityLevel(level: SecurityLevel): void {
    this.securityLevel = level;
  }

  async validateAction(
    action: string,
    params: Record<string, unknown>
  ): Promise<SecurityResult> {
    const warnings: string[] = [];
    const blockedReasons: string[] = [];
    let riskLevel: SecurityResult['riskLevel'] = 'low';

    const tier = (params._tier as string)?.toLowerCase() || 'full';
    const actionLower = action.toLowerCase();
    const paramsStr = JSON.stringify(params).toLowerCase();
    const scanText = `${action} ${paramsStr}`;

    // Claw Protect API integration - always run prompt injection check
    // Check cache first
    const cacheKey = scanText.slice(0, 200);
    const cached = injectionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      if (cached.result) {
        warnings.push('Claw Protect: Prompt injection detected (cached)');
        riskLevel = 'high';
        if (cached.warnings) {
          warnings.push(...cached.warnings);
        }
      }
    } else {
      try {
        const injectionResult = await checkPromptInjection(scanText);
        cacheSet(cacheKey, {
          result: injectionResult.detected,
          warnings: injectionResult.warnings || [],
          timestamp: Date.now(),
        });
        if (injectionResult.detected) {
          warnings.push('Claw Protect: Prompt injection detected');
          riskLevel = 'high';
          if (injectionResult.warnings) {
            warnings.push(...injectionResult.warnings);
          }
        }
      } catch (err) {
        console.error('Claw Protect injection check failed:', err);
      }
    }

    // Secrets detection - only run for 'full' or 'custom' tiers
    if (tier === 'full' || tier === 'custom') {
      try {
        const secrets = await scanForSecrets(scanText);
        if (secrets.length > 0) {
          warnings.push(`Claw Protect: Secrets detected - ${secrets.join(', ')}`);
          riskLevel = riskLevel === 'high' ? 'high' : 'medium';
        }
      } catch (err) {
        console.error('Claw Protect secrets scan failed:', err);
      }
    }

    // Local keyword-based injection detection - always run
    for (const keyword of INJECTION_KEYWORDS) {
      if (actionLower.includes(keyword) || paramsStr.includes(keyword)) {
        warnings.push(`Potential prompt injection keyword detected: ${keyword}`);
        riskLevel = 'high';
      }
    }

    // Local secret pattern detection - only run for 'full' or 'custom' tiers
    if (tier === 'full' || tier === 'custom') {
      for (const key of Object.keys(params)) {
        for (const pattern of SECRET_PATTERNS) {
          if (pattern.test(key)) {
            warnings.push(`Potential secret detected in parameter: ${key}`);
            riskLevel = riskLevel === 'high' ? 'high' : 'medium';
          }
        }
      }
    }

    if (warnings.some(w => w.includes('injection'))) {
      riskLevel = 'high';
    } else if (warnings.length > 0 && riskLevel === 'low') {
      riskLevel = 'medium';
    }

    let approved = true;

    let requiresConfirmation = false;

    if (this.securityLevel === 'active' || this.securityLevel === 'configurable') {
      if (riskLevel === 'high') {
        approved = false;
        requiresConfirmation = true;
        blockedReasons.push('High risk action requires user confirmation');
      }
    }

    if (this.securityLevel === 'passive' && riskLevel === 'high') {
      warnings.push('High risk action detected in passive mode - allowing but logging warning');
    }

    const result: SecurityResult = {
      approved,
      riskLevel,
      warnings,
      blockedReasons,
      requiresConfirmation,
    };

    const event: SecurityEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      action,
      result,
    };

    this.logEvent(event);

    return result;
  }

  private readonly MAX_EVENTS = 500;

  logEvent(event: SecurityEvent): void {
    this.events.push(event);
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-Math.floor(this.MAX_EVENTS * 0.8));
    }
  }

  getEvents(): SecurityEvent[] {
    return [...this.events];
  }
}

export const securityMiddleware = new SecurityMiddleware();
