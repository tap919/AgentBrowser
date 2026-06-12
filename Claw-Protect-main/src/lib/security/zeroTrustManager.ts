/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Zero Trust Architecture Manager - Addresses 2026 Trend: Zero Trust & Identity-First Security
// Implements continuous authentication, context-based access control, and dynamic trust scoring

export interface SessionContext {
  sessionId: string;
  agentId: string;
  userId?: string;
  deviceId: string;
  deviceHealth: 'healthy' | 'degraded' | 'compromised' | 'unknown';
  geolocation: {
    country: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastAuthenticated: Date;
  lastActivity: Date;
}

export interface TrustScore {
  sessionId: string;
  agentId: string;
  overallScore: number; // 0-100, where 100 is fully trusted
  factors: {
    identity: number; // Identity verification strength
    behavior: number; // Behavioral analysis
    device: number; // Device health and posture
    location: number; // Geolocation consistency
    time: number; // Time-based patterns
    network: number; // Network security
  };
  riskLevel: 'minimal' | 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  recommendations: string[];
}

export interface AccessRequest {
  sessionId: string;
  agentId: string;
  resource: string;
  action: 'read' | 'write' | 'execute' | 'delete' | 'admin';
  context: SessionContext;
  timestamp: Date;
}

export interface AccessDecision {
  granted: boolean;
  sessionId: string;
  resource: string;
  action: string;
  trustScore: number;
  riskLevel: string;
  reasons: string[];
  conditions?: string[]; // Additional conditions if granted
  timestamp: Date;
}

export interface BehaviorBaseline {
  agentId: string;
  typicalLocations: string[]; // Country codes
  typicalHours: number[]; // Hours of day (0-23)
  typicalResources: string[];
  typicalActions: string[];
  averageSessionDuration: number; // minutes
  createdAt: Date;
  lastUpdated: Date;
  sampleSize: number;
}

export interface IdentityThreat {
  id: string;
  sessionId: string;
  agentId: string;
  threatType: 'anomalous-location' | 'impossible-travel' | 'device-change' | 'behavior-drift' | 'privilege-escalation' | 'credential-stuffing';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  trustScoreImpact: number; // How much to reduce trust score
  recommendedAction: 'monitor' | 'challenge' | 'terminate' | 'block';
}

// ── OPA-inspired Resource Policies ────────────────────────────────────────
/**
 * Declarative resource-level access policy (Open Policy Agent style).
 * Evaluated AFTER the dynamic trust-score and threat checks.
 * Admins register policies via `zeroTrustManager.setResourcePolicy(...)`.
 */
export interface ResourcePolicy {
  /** Unique policy identifier */
  id: string;
  /** Agent this policy applies to. Use '*' to match any agent. */
  agentId: string;
  /**
   * Resource to protect.  Supports an exact match or a prefix wildcard:
   *   'tool:files'          → exact
   *   'tool:files/*'        → all resources starting with 'tool:files/'
   *   '*'                   → all resources
   */
  resource: string;
  /** Actions explicitly allowed. Empty array = deny every action. */
  allowedActions: Array<AccessRequest['action']>;
  /** Minimum trust score required (0-100). Defaults to 0 (no extra requirement). */
  minTrustScore: number;
  /** Optional extra conditions */
  conditions?: {
    /** Device must be in one of these states */
    deviceHealth?: Array<SessionContext['deviceHealth']>;
    /** Session country code must be in this list */
    countries?: string[];
    /** Hour of day (UTC 0-23) must be within this set */
    allowedHoursUTC?: number[];
  };
  /** Human-readable rationale */
  description?: string;
}

class ZeroTrustManager {
  private sessions: Map<string, SessionContext> = new Map();
  private trustScores: Map<string, TrustScore> = new Map();
  private behaviorBaselines: Map<string, BehaviorBaseline> = new Map();
  private accessLog: AccessDecision[] = [];
  private identityThreats: IdentityThreat[] = [];
  /** OPA-inspired resource policies keyed by policy.id */
  private resourcePolicies: Map<string, ResourcePolicy> = new Map();

  // Thresholds
  private readonly MIN_TRUST_SCORE = 40; // Below this, access denied
  private readonly CHALLENGE_THRESHOLD = 60; // Below this, require re-authentication
  private readonly SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
  private readonly MAX_TRAVEL_SPEED_KM_PER_HOUR = 1000; // Detect impossible travel
  private readonly BEHAVIOR_DRIFT_THRESHOLD = 30; // Points for significant drift

  /**
   * Create or update a session with context
   */
  createSession(context: Omit<SessionContext, 'createdAt' | 'lastAuthenticated' | 'lastActivity'>): SessionContext {
    const session: SessionContext = {
      ...context,
      createdAt: new Date(),
      lastAuthenticated: new Date(),
      lastActivity: new Date(),
    };

    this.sessions.set(context.sessionId, session);
    
    // Initialize trust score
    this.updateTrustScore(context.sessionId);
    
    return session;
  }

  /**
   * Update session activity timestamp
   */
  updateSessionActivity(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.lastActivity = new Date();
    this.sessions.set(sessionId, session);
    
    // Re-calculate trust score on activity
    this.updateTrustScore(sessionId);
    
    return true;
  }

  /**
   * Calculate dynamic trust score based on multiple factors
   */
  updateTrustScore(sessionId: string): TrustScore | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const baseline = this.behaviorBaselines.get(session.agentId);
    
    // Calculate individual factor scores
    const identityScore = this.calculateIdentityScore(session);
    const behaviorScore = this.calculateBehaviorScore(session, baseline);
    const deviceScore = this.calculateDeviceScore(session);
    const locationScore = this.calculateLocationScore(session, baseline);
    const timeScore = this.calculateTimeScore(session, baseline);
    const networkScore = this.calculateNetworkScore(session);

    // Weighted average (can be adjusted based on security posture)
    const overallScore = Math.round(
      identityScore * 0.25 +
      behaviorScore * 0.25 +
      deviceScore * 0.15 +
      locationScore * 0.15 +
      timeScore * 0.10 +
      networkScore * 0.10
    );

    // Determine risk level
    let riskLevel: TrustScore['riskLevel'];
    if (overallScore >= 80) riskLevel = 'minimal';
    else if (overallScore >= 60) riskLevel = 'low';
    else if (overallScore >= 40) riskLevel = 'medium';
    else if (overallScore >= 20) riskLevel = 'high';
    else riskLevel = 'critical';

    // Generate recommendations
    const recommendations: string[] = [];
    if (identityScore < 60) recommendations.push('Re-authenticate user identity');
    if (deviceScore < 60) recommendations.push('Verify device health and security posture');
    if (locationScore < 60) recommendations.push('Unusual location detected - verify legitimacy');
    if (behaviorScore < 60) recommendations.push('Behavioral anomaly detected - monitor closely');
    if (overallScore < this.MIN_TRUST_SCORE) recommendations.push('ACCESS DENIED - Trust score too low');
    else if (overallScore < this.CHALLENGE_THRESHOLD) recommendations.push('Require additional authentication');

    const trustScore: TrustScore = {
      sessionId,
      agentId: session.agentId,
      overallScore,
      factors: {
        identity: identityScore,
        behavior: behaviorScore,
        device: deviceScore,
        location: locationScore,
        time: timeScore,
        network: networkScore,
      },
      riskLevel,
      timestamp: new Date(),
      recommendations,
    };

    this.trustScores.set(sessionId, trustScore);
    
    // Check for identity threats
    this.detectIdentityThreats(session, trustScore);
    
    return trustScore;
  }

  /**
   * Calculate identity verification score
   */
  private calculateIdentityScore(session: SessionContext): number {
    let score = 100;
    
    // Check if recently authenticated
    const timeSinceAuth = Date.now() - session.lastAuthenticated.getTime();
    const minutesSinceAuth = timeSinceAuth / (60 * 1000);
    
    if (minutesSinceAuth > 60) score -= 20; // Not authenticated in last hour
    else if (minutesSinceAuth > 30) score -= 10; // Not authenticated in last 30 min
    
    // Check device identity
    if (!session.deviceId) score -= 30;
    
    // Check user identity
    if (!session.userId) score -= 20;
    
    return Math.max(0, score);
  }

  /**
   * Calculate behavior score based on baseline
   */
  private calculateBehaviorScore(session: SessionContext, baseline?: BehaviorBaseline): number {
    if (!baseline) return 70; // Default neutral score without baseline
    
    let score = 100;
    const currentHour = new Date().getHours();
    
    // Check if current hour matches typical hours
    if (!baseline.typicalHours.includes(currentHour)) {
      score -= 15;
    }
    
    // Session duration check
    const sessionDuration = (Date.now() - session.createdAt.getTime()) / (60 * 1000);
    if (sessionDuration > baseline.averageSessionDuration * 2) {
      score -= 10; // Session unusually long
    }
    
    return Math.max(0, score);
  }

  /**
   * Calculate device health score
   */
  private calculateDeviceScore(session: SessionContext): number {
    switch (session.deviceHealth) {
      case 'healthy':
        return 100;
      case 'degraded':
        return 60;
      case 'compromised':
        return 0;
      case 'unknown':
      default:
        return 50;
    }
  }

  /**
   * Calculate location score based on baseline
   */
  private calculateLocationScore(session: SessionContext, baseline?: BehaviorBaseline): number {
    if (!baseline) return 70; // Default neutral score
    
    let score = 100;
    
    // Check if location is typical
    if (!baseline.typicalLocations.includes(session.geolocation.country)) {
      score -= 30; // New location
    }
    
    // Check for impossible travel (implemented in detectIdentityThreats)
    
    return Math.max(0, score);
  }

  /**
   * Calculate time-based score
   */
  private calculateTimeScore(session: SessionContext, baseline?: BehaviorBaseline): number {
    if (!baseline) return 70;
    
    let score = 100;
    const currentHour = new Date().getHours();
    
    // Check if activity is during typical hours
    if (!baseline.typicalHours.includes(currentHour)) {
      score -= 20; // Activity outside normal hours
    }
    
    return Math.max(0, score);
  }

  /**
   * Calculate network security score
   */
  private calculateNetworkScore(session: SessionContext): number {
    let score = 100;
    
    // Check for private/local IPs (more trusted)
    if (session.ipAddress.startsWith('127.') || session.ipAddress.startsWith('192.168.')) {
      score = 100; // Local network
    }
    // Check for suspicious IP patterns (simplified)
    else if (session.ipAddress.startsWith('10.')) {
      score = 90; // Private network
    }
    
    return score;
  }

  /**
   * Detect identity threats based on session and trust score
   */
  private detectIdentityThreats(session: SessionContext, trustScore: TrustScore): void {
    const threats: IdentityThreat[] = [];
    
    // Check for impossible travel
    const previousSessions = Array.from(this.sessions.values())
      .filter(s => s.agentId === session.agentId && s.sessionId !== session.sessionId)
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
    
    if (previousSessions.length > 0) {
      const lastSession = previousSessions[0];
      const timeDiff = session.createdAt.getTime() - lastSession.lastActivity.getTime();
      const hoursDiff = timeDiff / (60 * 60 * 1000);
      
      // If locations differ and time is short, check for impossible travel
      if (lastSession.geolocation.country !== session.geolocation.country && hoursDiff < 12) {
        threats.push({
          id: `threat_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`,
          sessionId: session.sessionId,
          agentId: session.agentId,
          threatType: 'impossible-travel',
          severity: 'critical',
          description: `Session location changed from ${lastSession.geolocation.country} to ${session.geolocation.country} in ${hoursDiff.toFixed(1)} hours`,
          detectedAt: new Date(),
          trustScoreImpact: 40,
          recommendedAction: 'terminate',
        });
      }
    }
    
    // Check for device changes
    if (previousSessions.length > 0 && previousSessions[0].deviceId !== session.deviceId) {
      threats.push({
        id: `threat_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`,
        sessionId: session.sessionId,
        agentId: session.agentId,
        threatType: 'device-change',
        severity: 'medium',
        description: 'Device ID changed from previous session',
        detectedAt: new Date(),
        trustScoreImpact: 20,
        recommendedAction: 'challenge',
      });
    }
    
    // Check for anomalous location
    const baseline = this.behaviorBaselines.get(session.agentId);
    if (baseline && !baseline.typicalLocations.includes(session.geolocation.country)) {
      threats.push({
        id: `threat_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`,
        sessionId: session.sessionId,
        agentId: session.agentId,
        threatType: 'anomalous-location',
        severity: 'medium',
        description: `Access from unusual location: ${session.geolocation.country}`,
        detectedAt: new Date(),
        trustScoreImpact: 15,
        recommendedAction: 'challenge',
      });
    }
    
    // Check for behavior drift (low behavior score)
    if (trustScore.factors.behavior < 50) {
      threats.push({
        id: `threat_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`,
        sessionId: session.sessionId,
        agentId: session.agentId,
        threatType: 'behavior-drift',
        severity: 'medium',
        description: 'Significant behavioral deviation detected',
        detectedAt: new Date(),
        trustScoreImpact: this.BEHAVIOR_DRIFT_THRESHOLD,
        recommendedAction: 'monitor',
      });
    }
    
    // Store detected threats (de-duplicate by sessionId + threatType within 5 minutes)
    const now = Date.now();
    const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
    
    threats.forEach(threat => {
      // Check if we already have this type of threat for this session recently
      const existingThreat = this.identityThreats.find(
        t => t.sessionId === threat.sessionId &&
             t.threatType === threat.threatType &&
             (now - t.detectedAt.getTime()) < DEDUP_WINDOW_MS
      );
      
      // Only add if not a duplicate
      if (!existingThreat) {
        this.identityThreats.push(threat);
      }
    });
    
    // Limit stored threats
    if (this.identityThreats.length > 1000) {
      this.identityThreats = this.identityThreats.slice(-1000);
    }
  }

  /**
   * Register or replace a resource policy.
   */
  setResourcePolicy(policy: ResourcePolicy): void {
    this.resourcePolicies.set(policy.id, policy);
  }

  /**
   * Remove a resource policy.
   */
  removeResourcePolicy(policyId: string): boolean {
    return this.resourcePolicies.delete(policyId);
  }

  /**
   * List registered resource policies.
   */
  getResourcePolicies(): ResourcePolicy[] {
    return Array.from(this.resourcePolicies.values());
  }

  /**
   * Evaluate OPA-style declarative policies for this request.
   * Returns null when no policy applies, otherwise a decision fragment.
   */
  private evaluateResourcePolicies(
    request: AccessRequest,
    trustScore: TrustScore,
  ): { granted: boolean; reasons: string[]; conditions?: string[] } | null {
    const matchingPolicies = Array.from(this.resourcePolicies.values()).filter((policy) => {
      const agentMatches = policy.agentId === '*' || policy.agentId === request.agentId;
      const resourceMatches =
        policy.resource === '*' ||
        policy.resource === request.resource ||
        (policy.resource.endsWith('/*') &&
          request.resource.startsWith(policy.resource.slice(0, -1)));

      return agentMatches && resourceMatches;
    });

    if (matchingPolicies.length === 0) {
      return null;
    }

    for (const policy of matchingPolicies) {
      const reasons: string[] = [];
      const conditions: string[] = [];

      if (!policy.allowedActions.includes(request.action)) {
        reasons.push(`Resource policy '${policy.id}' denies action '${request.action}'`);
        return { granted: false, reasons };
      }

      if (trustScore.overallScore < policy.minTrustScore) {
        reasons.push(
          `Resource policy '${policy.id}' requires trust score >= ${policy.minTrustScore}`,
        );
        return { granted: false, reasons };
      }

      if (
        policy.conditions?.deviceHealth &&
        !policy.conditions.deviceHealth.includes(request.context.deviceHealth)
      ) {
        reasons.push(
          `Resource policy '${policy.id}' requires device health in [${policy.conditions.deviceHealth.join(', ')}]`,
        );
        return { granted: false, reasons };
      }

      if (
        policy.conditions?.countries &&
        !policy.conditions.countries.includes(request.context.geolocation.country)
      ) {
        reasons.push(
          `Resource policy '${policy.id}' requires location in [${policy.conditions.countries.join(', ')}]`,
        );
        return { granted: false, reasons };
      }

      if (policy.conditions?.allowedHoursUTC) {
        const currentUtcHour = request.timestamp.getUTCHours();
        if (!policy.conditions.allowedHoursUTC.includes(currentUtcHour)) {
          reasons.push(
            `Resource policy '${policy.id}' denies access outside allowed UTC hours`,
          );
          return { granted: false, reasons };
        }
      }

      reasons.push(`Resource policy '${policy.id}' approved request`);
      if (policy.description) {
        conditions.push(policy.description);
      }

      return {
        granted: true,
        reasons,
        conditions: conditions.length > 0 ? conditions : undefined,
      };
    }

    return null;
  }

  /**
   * Make access decision based on Zero Trust principles
   */
  makeAccessDecision(request: AccessRequest): AccessDecision {
    const session = this.sessions.get(request.sessionId);
    const trustScore = this.trustScores.get(request.sessionId);
    
    const decision: AccessDecision = {
      granted: false,
      sessionId: request.sessionId,
      resource: request.resource,
      action: request.action,
      trustScore: trustScore?.overallScore || 0,
      riskLevel: trustScore?.riskLevel || 'critical',
      reasons: [],
      timestamp: new Date(),
    };
    
    // Check if session exists
    if (!session) {
      decision.reasons.push('Session not found');
      this.accessLog.push(decision);
      return decision;
    }
    
    // Validate that request.agentId matches session.agentId to prevent confused deputy
    if (request.agentId !== session.agentId) {
      decision.reasons.push(`Agent ID mismatch: request claims '${request.agentId}' but session belongs to '${session.agentId}'`);
      this.accessLog.push(decision);
      return decision;
    }
    
    // Check if session is expired
    const sessionAge = Date.now() - session.lastActivity.getTime();
    if (sessionAge > this.SESSION_TIMEOUT_MS) {
      decision.reasons.push('Session expired');
      this.terminateSession(request.sessionId, 'timeout');
      this.accessLog.push(decision);
      return decision;
    }
    
    // Check trust score
    if (!trustScore || trustScore.overallScore < this.MIN_TRUST_SCORE) {
      decision.reasons.push(`Trust score too low: ${trustScore?.overallScore || 0}`);
      decision.reasons.push(...(trustScore?.recommendations || []));
      this.accessLog.push(decision);
      return decision;
    }
    
    // Check for active threats
    const activeThreats = this.identityThreats.filter(
      t => t.sessionId === request.sessionId && t.severity === 'critical'
    );
    
    if (activeThreats.length > 0) {
      decision.reasons.push('Active critical threats detected');
      activeThreats.forEach(t => decision.reasons.push(t.description));
      this.accessLog.push(decision);
      return decision;
    }
    
    // Grant access with conditions based on risk level
    decision.granted = true;
    decision.reasons.push('Access granted based on trust score');
    
    // Add conditions for lower trust scores
    if (trustScore.overallScore < this.CHALLENGE_THRESHOLD) {
      decision.conditions = ['Require re-authentication within 5 minutes'];
      decision.reasons.push('Low trust score - additional authentication required');
    }
    
    // Update session activity
    this.updateSessionActivity(request.sessionId);
    
    // Update baseline
    this.updateBehaviorBaseline(session, request);
    
    this.accessLog.push(decision);
    
    // Limit access log
    if (this.accessLog.length > 10000) {
      this.accessLog = this.accessLog.slice(-10000);
    }
    
    return decision;
  }

  /**
   * Terminate session (Zero Trust principle: terminate on suspicious behavior)
   */
  terminateSession(sessionId: string, reason: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    this.sessions.delete(sessionId);
    this.trustScores.delete(sessionId);
    
    // Note: Removed console.log - callers should handle logging as needed
    // Previous log was: `[Zero Trust] Session ${sessionId} terminated: ${reason}`
    
    return true;
  }

  /**
   * Update behavior baseline for agent (learning normal patterns)
   */
  private updateBehaviorBaseline(session: SessionContext, request: AccessRequest): void {
    let baseline = this.behaviorBaselines.get(session.agentId);
    
    if (!baseline) {
      baseline = {
        agentId: session.agentId,
        typicalLocations: [session.geolocation.country],
        typicalHours: [new Date().getHours()],
        typicalResources: [request.resource],
        typicalActions: [request.action],
        averageSessionDuration: 30, // Default 30 minutes
        createdAt: new Date(),
        lastUpdated: new Date(),
        sampleSize: 1,
      };
    } else {
      // Update typical locations
      if (!baseline.typicalLocations.includes(session.geolocation.country)) {
        baseline.typicalLocations.push(session.geolocation.country);
      }
      
      // Update typical hours
      const currentHour = new Date().getHours();
      if (!baseline.typicalHours.includes(currentHour)) {
        baseline.typicalHours.push(currentHour);
      }
      
      // Update typical resources
      if (!baseline.typicalResources.includes(request.resource)) {
        baseline.typicalResources.push(request.resource);
      }
      
      // Update typical actions
      if (!baseline.typicalActions.includes(request.action)) {
        baseline.typicalActions.push(request.action);
      }
      
      baseline.lastUpdated = new Date();
      baseline.sampleSize++;
    }
    
    this.behaviorBaselines.set(session.agentId, baseline);
  }

  /**
   * Get trust score for session
   */
  getTrustScore(sessionId: string): TrustScore | null {
    return this.trustScores.get(sessionId) || null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): SessionContext[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get identity threats for session or agent
   */
  getIdentityThreats(filter?: { sessionId?: string; agentId?: string; severity?: string }): IdentityThreat[] {
    let threats = this.identityThreats;
    
    if (filter?.sessionId) {
      threats = threats.filter(t => t.sessionId === filter.sessionId);
    }
    
    if (filter?.agentId) {
      threats = threats.filter(t => t.agentId === filter.agentId);
    }
    
    if (filter?.severity) {
      threats = threats.filter(t => t.severity === filter.severity);
    }
    
    return threats;
  }

  /**
   * Get access log
   */
  getAccessLog(filter?: { sessionId?: string; agentId?: string; granted?: boolean }): AccessDecision[] {
    let log = this.accessLog;
    
    if (filter?.sessionId) {
      log = log.filter(l => l.sessionId === filter.sessionId);
    }
    
    if (filter?.granted !== undefined) {
      log = log.filter(l => l.granted === filter.granted);
    }
    
    return log;
  }

  /**
   * Get statistics for monitoring dashboard
   */
  getStatistics() {
    const activeSessions = this.getActiveSessions();
    const recentThreats = this.identityThreats.filter(
      t => Date.now() - t.detectedAt.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    );
    
    const trustScores = Array.from(this.trustScores.values());
    const avgTrustScore = trustScores.length > 0
      ? trustScores.reduce((sum, ts) => sum + ts.overallScore, 0) / trustScores.length
      : 0;
    
    const recentAccessLog = this.accessLog.filter(
      l => Date.now() - l.timestamp.getTime() < 24 * 60 * 60 * 1000
    );
    
    return {
      activeSessions: activeSessions.length,
      averageTrustScore: Math.round(avgTrustScore),
      threatsLast24h: recentThreats.length,
      criticalThreats: recentThreats.filter(t => t.severity === 'critical').length,
      accessRequestsLast24h: recentAccessLog.length,
      accessDeniedLast24h: recentAccessLog.filter(l => !l.granted).length,
      riskLevelDistribution: {
        minimal: trustScores.filter(ts => ts.riskLevel === 'minimal').length,
        low: trustScores.filter(ts => ts.riskLevel === 'low').length,
        medium: trustScores.filter(ts => ts.riskLevel === 'medium').length,
        high: trustScores.filter(ts => ts.riskLevel === 'high').length,
        critical: trustScores.filter(ts => ts.riskLevel === 'critical').length,
      },
    };
  }
}

// Export singleton instance
export const zeroTrustManager = new ZeroTrustManager();
