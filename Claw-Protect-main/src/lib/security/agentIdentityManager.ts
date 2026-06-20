/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as crypto from 'crypto';

const IDENTITY_SECRET = process.env.CLAW_IDENTITY_SECRET || (() => { throw new Error('CLAW_IDENTITY_SECRET env var must be set'); })();

// Inter-Agent Identity Verification - Addresses Problem #8: Agent Identity Spoofing
// Enforces authentication between agents in multi-agent setups

export interface AgentIdentity {
  agentId: string;
  publicKey: string;
  role: string;
  trustedBy: string[]; // List of agent IDs that trust this agent
  createdAt: Date;
  lastAuthenticated?: Date;
}

export interface AuthenticationChallenge {
  challengeId: string;
  fromAgent: string;
  toAgent: string;
  nonce: string;
  timestamp: Date;
  expiresAt: Date;
}

export interface AuthenticationResult {
  success: boolean;
  agentId: string;
  verifiedRole: string;
  timestamp: Date;
  message?: string;
}

class AgentIdentityManager {
  private identities: Map<string, AgentIdentity> = new Map();
  private activeChallenges: Map<string, AuthenticationChallenge> = new Map();
  private authenticationLog: AuthenticationResult[] = [];


  /**
   * Register a new agent identity - Problem #8: Agent Identity Spoofing
   */
  registerAgent(agentId: string, publicKey: string, role: string): AgentIdentity {
    const identity: AgentIdentity = {
      agentId,
      publicKey,
      role,
      trustedBy: [],
      createdAt: new Date(),
    };

    this.identities.set(agentId, identity);
    return identity;
  }

  /**
   * Create authentication challenge
   */
  createChallenge(fromAgent: string, toAgent: string): AuthenticationChallenge {
    const challengeId = `ch_${Date.now()}_${crypto.randomUUID().split('-').join('').slice(0, 9)}`;
    const nonce = this.generateNonce();
    
    const challenge: AuthenticationChallenge = {
      challengeId,
      fromAgent,
      toAgent,
      nonce,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    };

    this.activeChallenges.set(challengeId, challenge);
    
    // Clean up expired challenges
    this.cleanupExpiredChallenges();
    
    return challenge;
  }

  /**
   * Verify agent response to challenge (simplified - in production use crypto signatures)
   */
  verifyChallenge(challengeId: string, agentId: string, response: string): AuthenticationResult {
    const challenge = this.activeChallenges.get(challengeId);
    const identity = this.identities.get(agentId);

    const result: AuthenticationResult = {
      success: false,
      agentId,
      verifiedRole: '',
      timestamp: new Date(),
    };

    if (!challenge) {
      result.message = 'Challenge not found or expired';
      this.logAuthentication(result);
      return result;
    }

    if (!identity) {
      result.message = 'Agent identity not registered';
      this.logAuthentication(result);
      return result;
    }

    if (challenge.toAgent !== agentId) {
      result.message = 'Challenge not issued to this agent';
      this.logAuthentication(result);
      return result;
    }

    if (new Date() > challenge.expiresAt) {
      result.message = 'Challenge expired';
      this.activeChallenges.delete(challengeId);
      this.logAuthentication(result);
      return result;
    }

    // In production, verify cryptographic signature here
    // For now, simple validation
    const expectedResponse = this.hashChallenge(challenge.nonce, identity.publicKey);
    
    if (response === expectedResponse) {
      result.success = true;
      result.verifiedRole = identity.role;
      identity.lastAuthenticated = new Date();
      this.activeChallenges.delete(challengeId);
    } else {
      result.message = 'Invalid response signature';
    }

    this.logAuthentication(result);
    return result;
  }

  /**
   * Establish trust relationship between agents
   */
  establishTrust(trustingAgent: string, trustedAgent: string): boolean {
    const identity = this.identities.get(trustedAgent);
    
    if (!identity) {
      return false;
    }

    if (!identity.trustedBy.includes(trustingAgent)) {
      identity.trustedBy.push(trustingAgent);
    }

    return true;
  }

  /**
   * Check if agent is trusted by another agent
   */
  isTrusted(agentId: string, byAgent: string): boolean {
    const identity = this.identities.get(agentId);
    return identity ? identity.trustedBy.includes(byAgent) : false;
  }

  /**
   * Detect potential spoofing attempts
   */
  detectSpoofing(agentId: string): {
    isSuspicious: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];
    const identity = this.identities.get(agentId);

    if (!identity) {
      return { isSuspicious: true, reasons: ['Agent not registered'] };
    }

    // Check for recent failed authentication attempts
    const recentFailed = this.authenticationLog
      .filter(log => 
        log.agentId === agentId && 
        !log.success && 
        log.timestamp > new Date(Date.now() - 10 * 60 * 1000)
      );

    if (recentFailed.length > 3) {
      reasons.push(`${recentFailed.length} failed authentication attempts in last 10 minutes`);
    }

    // Check if never authenticated
    if (!identity.lastAuthenticated) {
      const daysSinceCreation = (Date.now() - identity.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation > 1) {
        reasons.push('Agent registered but never authenticated');
      }
    }

    // Check for role elevation attempts (would need more context in production)
    const roleElevationAttempts = recentFailed.filter(log => 
      log.message?.includes('role') || log.message?.includes('permission')
    );
    
    if (roleElevationAttempts.length > 0) {
      reasons.push('Potential role elevation attempts detected');
    }

    return {
      isSuspicious: reasons.length > 0,
      reasons,
    };
  }

  /**
   * Get agent identity
   */
  getIdentity(agentId: string): AgentIdentity | undefined {
    return this.identities.get(agentId);
  }

  /**
   * List all registered agents
   */
  listAgents(): AgentIdentity[] {
    return Array.from(this.identities.values());
  }

  /**
   * Get authentication audit log
   */
  getAuthenticationLog(limit: number = 100): AuthenticationResult[] {
    return this.authenticationLog.slice(-limit).reverse();
  }

  /**
   * Generate random nonce
   */
  private generateNonce(): string {
    return crypto.randomUUID() + Date.now().toString(36);
  }

  /**
   * Simple hash function (in production, use proper crypto)
   */
  private hashChallenge(nonce: string, publicKey: string): string {
    return crypto.createHmac('sha256', IDENTITY_SECRET).update(nonce + publicKey).digest('hex');
  }

  /**
   * Log authentication attempt
   */
  private logAuthentication(result: AuthenticationResult): void {
    this.authenticationLog.push(result);
    
    if (this.authenticationLog.length > 5000) {
      this.authenticationLog = this.authenticationLog.slice(-5000);
    }
  }

  /**
   * Clean up expired challenges
   */
  private cleanupExpiredChallenges(): void {
    const now = new Date();
    for (const [id, challenge] of this.activeChallenges.entries()) {
      if (now > challenge.expiresAt) {
        this.activeChallenges.delete(id);
      }
    }
  }

  /**
   * Revoke agent identity
   */
  revokeAgent(agentId: string): boolean {
    return this.identities.delete(agentId);
  }

  generateChallenge(agentId: string) {
    if (!this.identities.has(agentId)) {
      this.registerAgent(agentId, `${agentId}-public-key`, 'agent');
    }
    const challenge = this.createChallenge('system', agentId);
    return {
      challengeId: challenge.challengeId,
      challenge: challenge.nonce,
    };
  }

  generateResponse(agentId: string, challenge: string): string {
    return crypto.createHmac('sha256', IDENTITY_SECRET).update(`${agentId}:${challenge}`).digest('hex');
  }

  verifyResponse(challengeId: string, response: string) {
    const challenge = this.activeChallenges.get(challengeId);
    if (!challenge) {
      return { verified: false, spoofingDetected: false };
    }
    const expected = this.generateResponse(challenge.toAgent, challenge.nonce);
    const verified = response === expected;
    const decoded = Buffer.from(response, 'base64').toString('utf8');
    const spoofingDetected = !verified && decoded.length > 0;
    if (verified) {
      this.verifyChallenge(challengeId, challenge.toAgent, this.hashChallenge(challenge.nonce, this.identities.get(challenge.toAgent)?.publicKey || `${challenge.toAgent}-public-key`));
    }
    return { verified, spoofingDetected };
  }
}

// Singleton instance
export const agentIdentityManager = new AgentIdentityManager();
