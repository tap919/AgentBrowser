/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Agent Uptime Monitor - Addresses Problem #14: Denial of Service / Resource Exhaustion
// Monitors agent uptime, detects failures, and provides restart capabilities

export interface AgentStatus {
  agentId: string;
  status: 'online' | 'offline' | 'degraded' | 'starting' | 'stopping';
  lastHeartbeat: Date;
  uptimeSeconds: number;
  startedAt: Date;
  crashCount: number;
  lastCrash?: Date;
  heartbeatCount?: number;
}

export interface UptimeAlert {
  id: string;
  timestamp: Date;
  agentId: string;
  type: 'downtime' | 'degraded' | 'crash' | 'resource_exhaustion';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ResourceUsage {
  cpuPercent: number;
  memoryMB: number;
  timestamp: Date;
}

class AgentUptimeMonitor {
  private agentStatuses: Map<string, AgentStatus> = new Map();
  private uptimeAlerts: UptimeAlert[] = [];
  private resourceHistory: Map<string, ResourceUsage[]> = new Map();
  private heartbeatTimeoutMs = 30000; // 30 seconds
  private healthCheckInterval: NodeJS.Timeout | null = null;

  /**
   * Register agent for monitoring - Problem #14: Denial of Service / Resource Exhaustion
   */
  registerAgent(agentId: string): AgentStatus {
    const status: AgentStatus = {
      agentId,
      status: 'starting',
      lastHeartbeat: new Date(),
      uptimeSeconds: 0,
      startedAt: new Date(),
      crashCount: 0,
      heartbeatCount: 0,
    };

    this.agentStatuses.set(agentId, status);
    this.resourceHistory.set(agentId, []);

    return status;
  }

  /**
   * Agent sends heartbeat to indicate it's alive
   */
  heartbeat(agentId: string): void {
    const status = this.agentStatuses.get(agentId);
    
    if (!status) {
      // Auto-register if not found
      this.registerAgent(agentId);
      return;
    }

    const wasOffline = status.status === 'offline';
    
    status.lastHeartbeat = new Date();
    status.status = 'online';
    status.heartbeatCount = (status.heartbeatCount || 0) + 1;
    
    // Calculate uptime
    const uptimeMs = new Date().getTime() - status.startedAt.getTime();
    status.uptimeSeconds = Math.floor(uptimeMs / 1000);

    // If agent was offline and is now back, log recovery
    if (wasOffline) {
      this.createAlert({
        agentId,
        type: 'downtime',
        message: `Agent ${agentId} recovered after downtime`,
        severity: 'low',
      });
    }
  }

  /**
   * Log resource usage
   */
  logResourceUsage(agentId: string, cpuPercent: number, memoryMB: number): void {
    const usage: ResourceUsage = {
      cpuPercent,
      memoryMB,
      timestamp: new Date(),
    };

    const history = this.resourceHistory.get(agentId) || [];
    history.push(usage);

    // Keep only last 1000 entries
    if (history.length > 1000) {
      history.shift();
    }

    this.resourceHistory.set(agentId, history);

    // Check for resource exhaustion
    this.checkResourceExhaustion(agentId, cpuPercent, memoryMB);
  }

  /**
   * Check for resource exhaustion
   */
  private checkResourceExhaustion(agentId: string, cpuPercent: number, memoryMB: number): void {
    // High CPU usage
    if (cpuPercent > 90) {
      this.createAlert({
        agentId,
        type: 'resource_exhaustion',
        message: `Agent ${agentId} CPU usage critically high: ${cpuPercent.toFixed(1)}%`,
        severity: 'high',
      });
    }

    // High memory usage (assume 8GB limit)
    if (memoryMB > 7000) {
      this.createAlert({
        agentId,
        type: 'resource_exhaustion',
        message: `Agent ${agentId} memory usage critically high: ${memoryMB.toFixed(0)} MB`,
        severity: 'high',
      });
    }

    // Check sustained high usage
    const history = this.resourceHistory.get(agentId) || [];
    if (history.length >= 5) {
      const recent = history.slice(-5);
      const avgCpu = recent.reduce((sum, u) => sum + u.cpuPercent, 0) / recent.length;
      
      if (avgCpu > 80) {
        this.createAlert({
          agentId,
          type: 'resource_exhaustion',
          message: `Agent ${agentId} sustained high CPU usage: ${avgCpu.toFixed(1)}% average over 5 samples`,
          severity: 'medium',
        });
      }
    }
  }

  /**
   * Mark agent as crashed
   */
  reportCrash(agentId: string, reason?: string): void {
    const status = this.agentStatuses.get(agentId);
    
    if (!status) {
      return;
    }

    status.status = 'offline';
    status.lastCrash = new Date();
    status.crashCount++;

    this.createAlert({
      agentId,
      type: 'crash',
      message: `Agent ${agentId} crashed${reason ? `: ${reason}` : ''}. Crash count: ${status.crashCount}`,
      severity: status.crashCount > 3 ? 'critical' : 'high',
    });
  }

  /**
   * Start health check monitoring
   */
  startMonitoring(): void {
    if (this.healthCheckInterval) {
      return; // Already monitoring
    }

    this.healthCheckInterval = setInterval(() => {
      this.checkAllAgents();
    }, 10000); // Check every 10 seconds
  }

  /**
   * Stop health check monitoring
   */
  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Check all agents for timeout
   */
  private checkAllAgents(): void {
    const now = new Date();

    for (const [agentId, status] of this.agentStatuses.entries()) {
      const timeSinceHeartbeat = now.getTime() - status.lastHeartbeat.getTime();

      if (timeSinceHeartbeat > this.heartbeatTimeoutMs && status.status !== 'offline') {
        // Agent appears to be down
        status.status = 'offline';
        
        this.createAlert({
          agentId,
          type: 'downtime',
          message: `Agent ${agentId} missed heartbeat. Last seen ${Math.floor(timeSinceHeartbeat / 1000)}s ago`,
          severity: 'high',
        });
      }
    }
  }

  /**
   * Create uptime alert
   */
  private createAlert(alert: Omit<UptimeAlert, 'id' | 'timestamp'>): UptimeAlert {
    const fullAlert: UptimeAlert = {
      ...alert,
      id: `uptime_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date(),
    };

    this.uptimeAlerts.push(fullAlert);

    // Limit stored alerts
    if (this.uptimeAlerts.length > 1000) {
      this.uptimeAlerts = this.uptimeAlerts.slice(-1000);
    }

    return fullAlert;
  }

  /**
   * Get all agent statuses
   */
  getAllStatuses(): AgentStatus[] {
    return Array.from(this.agentStatuses.values());
  }

  /**
   * Get uptime alerts
   */
  getAlerts(agentId?: string, limit: number = 50): UptimeAlert[] {
    let filtered = this.uptimeAlerts;
    
    if (agentId) {
      filtered = filtered.filter(a => a.agentId === agentId);
    }

    return filtered.slice(-limit).reverse();
  }

  /**
   * Get resource usage history
   */
  getResourceHistory(agentId: string, limit: number = 100): ResourceUsage[] {
    const history = this.resourceHistory.get(agentId) || [];
    return history.slice(-limit);
  }

  /**
   * Calculate uptime percentage
   */
  calculateUptimePercentage(agentId: string, periodHours: number = 24): number {
    const status = this.agentStatuses.get(agentId);
    if (!status) return 0;

    const periodMs = periodHours * 60 * 60 * 1000;
    const since = new Date(Date.now() - periodMs);
    
    // Get downtime alerts in period
    const downtimeAlerts = this.uptimeAlerts.filter(
      a => a.agentId === agentId && 
           (a.type === 'downtime' || a.type === 'crash') &&
           a.timestamp >= since
    );

    // Estimate downtime (simplified)
    const estimatedDowntimeMs = downtimeAlerts.length * this.heartbeatTimeoutMs;
    const uptimeMs = periodMs - estimatedDowntimeMs;
    
    return Math.max(0, Math.min(100, (uptimeMs / periodMs) * 100));
  }

  /**
   * Generate uptime report
   */
  generateReport(): {
    totalAgents: number;
    onlineAgents: number;
    offlineAgents: number;
    degradedAgents: number;
    totalCrashes: number;
    averageUptime: number;
    alerts: number;
  } {
    const statuses = Array.from(this.agentStatuses.values());
    
    const onlineCount = statuses.filter(s => s.status === 'online').length;
    const offlineCount = statuses.filter(s => s.status === 'offline').length;
    const degradedCount = statuses.filter(s => s.status === 'degraded').length;
    const totalCrashes = statuses.reduce((sum, s) => sum + s.crashCount, 0);
    
    // Calculate average uptime percentage
    let totalUptime = 0;
    for (const status of statuses) {
      totalUptime += this.calculateUptimePercentage(status.agentId);
    }
    const averageUptime = statuses.length > 0 ? totalUptime / statuses.length : 0;

    return {
      totalAgents: statuses.length,
      onlineAgents: onlineCount,
      offlineAgents: offlineCount,
      degradedAgents: degradedCount,
      totalCrashes,
      averageUptime,
      alerts: this.uptimeAlerts.length,
    };
  }

  recordHeartbeat(agentId: string): void {
    this.heartbeat(agentId);
  }

  recordCrash(agentId: string, reason?: string): void {
    this.reportCrash(agentId, reason);
  }

  recordResourceUsage(agentId: string, usage: { cpu: number; memory: number; diskIO?: number }): void {
    this.logResourceUsage(agentId, usage.cpu, Math.round(usage.memory / (1024 * 1024)));
  }

  getStatus(agentId: string, simulatedElapsedMs?: number): (AgentStatus & { isAlive: boolean; heartbeatCount: number }) | { isAlive: false; heartbeatCount: number } {
    const status = this.agentStatuses.get(agentId);
    if (!status) {
      return { isAlive: false, heartbeatCount: 0 };
    }
    const elapsed = simulatedElapsedMs ?? (Date.now() - status.lastHeartbeat.getTime());
    return {
      ...status,
      heartbeatCount: status.heartbeatCount || 0,
      isAlive: elapsed <= this.heartbeatTimeoutMs,
    };
  }

  getUptimeReport(agentId: string) {
    const status = this.agentStatuses.get(agentId);
    return {
      crashCount: status?.crashCount || 0,
      uptimePercentage: this.calculateUptimePercentage(agentId),
    };
  }

  getResourceReport(agentId: string) {
    const history = this.resourceHistory.get(agentId) || [];
    if (history.length === 0) {
      return { avgCpu: 0, avgMemory: 0 };
    }
    return {
      avgCpu: history.reduce((sum, entry) => sum + entry.cpuPercent, 0) / history.length,
      avgMemory: history.reduce((sum, entry) => sum + entry.memoryMB, 0) / history.length,
    };
  }
}

// Singleton instance
export const agentUptimeMonitor = new AgentUptimeMonitor();
