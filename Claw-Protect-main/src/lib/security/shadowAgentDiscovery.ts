/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shadow Agent Discovery - Addresses Problem #13: Shadow Agent Deployments with No Oversight
// Discovers and tracks all active agents in the environment

export interface DiscoveredAgent {
  agentId: string;
  discoveredAt: Date;
  source: string; // How the agent was discovered
  isRegistered: boolean;
  toolsAccessed: string[];
  servicesContacted: string[];
  activityLevel: 'low' | 'medium' | 'high';
  riskScore: number; // 0-100
  activityCount?: number;
}

export interface AgentCommunication {
  fromAgent: string;
  toAgent: string;
  timestamp: Date;
  messageType: string;
  isAuthorized: boolean;
}

export interface ShadowAgentAlert {
  id: string;
  timestamp: Date;
  agentId: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
}

class ShadowAgentDiscovery {
  private discoveredAgents: Map<string, DiscoveredAgent> = new Map();
  private registeredAgents: Set<string> = new Set();
  private communications: AgentCommunication[] = [];
  private alerts: ShadowAgentAlert[] = [];

  /**
   * Register known/authorized agent - Problem #13: Shadow Agent Deployments
   */
  registerAgent(agentId: string, _label?: string): void {
    this.registeredAgents.add(agentId);

    // Update discovery record if exists
    const discovered = this.discoveredAgents.get(agentId);
    if (discovered) {
      discovered.isRegistered = true;
    }
  }

  /**
   * Discover agent from network activity or tool usage
   */
  discoverAgent(
    agentId: string,
    source: 'network' | 'tool-usage' | 'api-call' | 'log-file' | 'other',
    metadata?: Record<string, any>
  ): DiscoveredAgent {
    let agent = this.discoveredAgents.get(agentId);

    if (!agent) {
      // New agent discovered
      agent = {
        agentId,
        discoveredAt: new Date(),
        source,
        isRegistered: this.registeredAgents.has(agentId),
        toolsAccessed: [],
        servicesContacted: [],
        activityLevel: 'low',
        riskScore: 0,
        activityCount: 0,
      };

      this.discoveredAgents.set(agentId, agent);

      // Create alert if not registered
      if (!agent.isRegistered) {
        this.createAlert({
          agentId,
          reason: `Unregistered agent discovered via ${source}`,
          severity: 'high',
          details: metadata || {},
        });
      }
    }

    // Update risk score
    agent.riskScore = this.calculateRiskScore(agent);

    return agent;
  }

  /**
   * Log tool access by agent
   */
  logToolAccess(agentId: string, toolName: string): void {
    const agent = this.discoverAgent(agentId, 'tool-usage');

    if (!agent.toolsAccessed.includes(toolName)) {
      agent.toolsAccessed.push(toolName);
    }

    // Update activity level
    this.updateActivityLevel(agent);
    
    // Recalculate risk
    agent.riskScore = this.calculateRiskScore(agent);
  }

  /**
   * Log service contact by agent
   */
  logServiceContact(agentId: string, serviceName: string): void {
    const agent = this.discoverAgent(agentId, 'network');

    if (!agent.servicesContacted.includes(serviceName)) {
      agent.servicesContacted.push(serviceName);
    }

    // Update activity level
    this.updateActivityLevel(agent);
    
    // Recalculate risk
    agent.riskScore = this.calculateRiskScore(agent);

    // Check for suspicious external services
    this.checkSuspiciousService(agentId, serviceName);
  }

  /**
   * Log agent-to-agent communication
   */
  logCommunication(fromAgent: string, toAgent: string, messageType: string): void {
    // Discover both agents if not known
    this.discoverAgent(fromAgent, 'network');
    this.discoverAgent(toAgent, 'network');

    const isAuthorized = 
      this.registeredAgents.has(fromAgent) && 
      this.registeredAgents.has(toAgent);

    const communication: AgentCommunication = {
      fromAgent,
      toAgent,
      timestamp: new Date(),
      messageType,
      isAuthorized,
    };

    this.communications.push(communication);

    // Alert on unauthorized communication
    if (!isAuthorized) {
      this.createAlert({
        agentId: fromAgent,
        reason: `Unauthorized agent-to-agent communication: ${fromAgent} -> ${toAgent}`,
        severity: 'medium',
        details: { toAgent, messageType, isAuthorized },
      });
    }

    // Limit communication history
    if (this.communications.length > 5000) {
      this.communications = this.communications.slice(-5000);
    }
  }

  /**
   * Calculate risk score for agent
   */
  private calculateRiskScore(agent: DiscoveredAgent): number {
    let score = 0;

    // Not registered = +40 points
    if (!agent.isRegistered) {
      score += 40;
    }

    // High number of tools accessed = +20 points
    if (agent.toolsAccessed.length > 10) {
      score += 20;
    } else if (agent.toolsAccessed.length > 5) {
      score += 10;
    }

    // High number of external services = +20 points
    if (agent.servicesContacted.length > 10) {
      score += 20;
    } else if (agent.servicesContacted.length > 5) {
      score += 10;
    }

    // High activity level = +10 points
    if (agent.activityLevel === 'high') {
      score += 10;
    } else if (agent.activityLevel === 'medium') {
      score += 5;
    }

    if ((agent.activityCount || 0) > 40) {
      score += 35;
    } else if ((agent.activityCount || 0) > 20) {
      score += 20;
    }

    // Check for suspicious tools
    const suspiciousTools = ['curl', 'wget', 'netcat', 'ssh', 'ftp'];
    const hasSuspiciousTools = agent.toolsAccessed.some(tool => 
      suspiciousTools.some(sus => tool.toLowerCase().includes(sus))
    );
    if (hasSuspiciousTools) {
      score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Update activity level based on usage
   */
  private updateActivityLevel(agent: DiscoveredAgent): void {
    const totalActivity = agent.toolsAccessed.length + agent.servicesContacted.length;

    if (totalActivity > 20) {
      agent.activityLevel = 'high';
    } else if (totalActivity > 10) {
      agent.activityLevel = 'medium';
    } else {
      agent.activityLevel = 'low';
    }
  }

  /**
   * Check for suspicious external service
   */
  private checkSuspiciousService(agentId: string, serviceName: string): void {
    const suspiciousKeywords = ['pastebin', 'filebin', 'transfer.sh', 'temp', 'anonymous'];
    
    for (const keyword of suspiciousKeywords) {
      if (serviceName.toLowerCase().includes(keyword)) {
        this.createAlert({
          agentId,
          reason: `Agent contacted suspicious service: ${serviceName}`,
          severity: 'high',
          details: { serviceName, keyword },
        });
        break;
      }
    }
  }

  /**
   * Create shadow agent alert
   */
  private createAlert(alert: Omit<ShadowAgentAlert, 'id' | 'timestamp'>): ShadowAgentAlert {
    const fullAlert: ShadowAgentAlert = {
      ...alert,
      id: `shadow_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date(),
    };

    this.alerts.push(fullAlert);

    // Limit stored alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }

    return fullAlert;
  }

  /**
   * Get all discovered agents
   */
  getDiscoveredAgents(): DiscoveredAgent[] {
    return Array.from(this.discoveredAgents.values());
  }

  /**
   * Get unregistered (shadow) agents
   */
  getShadowAgents(): DiscoveredAgent[] {
    return Array.from(this.discoveredAgents.values())
      .filter(agent => !agent.isRegistered);
  }

  /**
   * Get high-risk agents
   */
  getHighRiskAgents(threshold: number = 50): DiscoveredAgent[] {
    return Array.from(this.discoveredAgents.values())
      .filter(agent => agent.riskScore >= threshold)
      .sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Get agent-to-agent communication map
   */
  getCommunicationMap(): Map<string, Set<string>> {
    const map = new Map<string, Set<string>>();

    for (const comm of this.communications) {
      const targets = map.get(comm.fromAgent) || new Set();
      targets.add(comm.toAgent);
      map.set(comm.fromAgent, targets);
    }

    return map;
  }

  /**
   * Get alerts
   */
  getAlerts(agentId?: string, limit: number = 50): ShadowAgentAlert[] {
    let filtered = this.alerts;
    
    if (agentId) {
      filtered = filtered.filter(a => a.agentId === agentId);
    }

    return filtered.slice(-limit).reverse();
  }

  /**
   * Generate discovery report
   */
  generateReport(): {
    totalDiscovered: number;
    registeredAgents: number;
    shadowAgents: number;
    highRiskAgents: number;
    unauthorizedCommunications: number;
    recommendations: string[];
  } {
    const discovered = Array.from(this.discoveredAgents.values());
    const registered = discovered.filter(a => a.isRegistered).length;
    const shadow = discovered.filter(a => !a.isRegistered).length;
    const highRisk = this.getHighRiskAgents().length;
    const unauthorizedComms = this.communications.filter(c => !c.isAuthorized).length;

    const recommendations: string[] = [];
    
    if (shadow > 0) {
      recommendations.push(`URGENT: ${shadow} unregistered shadow agents detected`);
    }
    
    if (highRisk > 0) {
      recommendations.push(`Review ${highRisk} high-risk agents immediately`);
    }
    
    if (unauthorizedComms > 0) {
      recommendations.push(`Investigate ${unauthorizedComms} unauthorized agent communications`);
    }

    recommendations.push('Enable comprehensive agent registration and discovery');
    recommendations.push('Implement agent authentication for all communications');
    recommendations.push('Monitor network traffic for unknown agent signatures');

    return {
      totalDiscovered: discovered.length,
      registeredAgents: registered,
      shadowAgents: shadow,
      highRiskAgents: highRisk,
      unauthorizedCommunications: unauthorizedComms,
      recommendations,
    };
  }

  logActivity(agentId: string, action: string, resource: string): void {
    if (resource.startsWith('http')) {
      this.logServiceContact(agentId, resource);
    } else {
      this.logToolAccess(agentId, action);
    }
    const agent = this.discoveredAgents.get(agentId);
    if (agent && !agent.isRegistered) {
      agent.activityCount = (agent.activityCount || 0) + 1;
      agent.riskScore = this.calculateRiskScore(agent);
    }
  }

  getDiscoveries(): DiscoveredAgent[] {
    return this.getShadowAgents();
  }

  analyzeCommunications(agentId: string) {
    const communications = this.communications.filter(c => c.fromAgent === agentId || c.toAgent === agentId);
    return {
      communicationCount: communications.length,
      unauthorizedCount: communications.filter(c => !c.isAuthorized).length,
    };
  }

  getRiskScore(agentId: string): number {
    return this.discoveredAgents.get(agentId)?.riskScore ?? 0;
  }
}

// Singleton instance
export const shadowAgentDiscovery = new ShadowAgentDiscovery();
