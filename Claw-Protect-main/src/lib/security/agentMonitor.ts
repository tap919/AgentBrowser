/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Agent Activity Monitor - Addresses Problems #2, #5, #11, #15
// Provides behavioral baselining, logging, anomaly detection, and compliance tracking

export interface AgentActivity {
  id: string;
  timestamp: Date;
  agentId: string;
  action: string;
  resource: string;
  outcome: 'success' | 'failure' | 'blocked';
  metadata?: Record<string, any>;
}

export interface BehavioralBaseline {
  agentId: string;
  typicalActions: string[];
  typicalResources: string[];
  averageActionsPerHour: number;
  lastUpdated: Date;
}

export interface AnomalyAlert {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  agentId: string;
  details: Record<string, any>;
}

class AgentMonitor {
  private activities: AgentActivity[] = [];
  private baselines: Map<string, BehavioralBaseline> = new Map();
  private anomalies: AnomalyAlert[] = [];

  /**
   * Log an agent activity - Problem #5: No Logging or Audit Trail
   */
  logActivity(activity: Omit<AgentActivity, 'id' | 'timestamp'>): AgentActivity {
    const fullActivity: AgentActivity = {
      ...activity,
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date(),
    };
    
    this.activities.push(fullActivity);
    
    // Check for behavioral drift
    this.checkBehavioralDrift(fullActivity);
    
    // Limit stored activities to last 10000 for memory management
    if (this.activities.length > 10000) {
      this.activities = this.activities.slice(-10000);
    }
    
    return fullActivity;
  }

  /**
   * Get activity log for forensic analysis - Problem #15: Zero Compliance or Accountability
   */
  getActivityLog(agentId?: string, limit: number = 100): AgentActivity[] {
    let filtered = this.activities;
    
    if (agentId) {
      filtered = filtered.filter(a => a.agentId === agentId);
    }
    
    return filtered.slice(-limit).reverse();
  }

  /**
   * Establish behavioral baseline - Problem #2: Agent Going Off-Task (Behavioral Drift)
   */
  establishBaseline(agentId: string): BehavioralBaseline {
    const agentActivities = this.activities.filter(a => a.agentId === agentId);
    
    if (agentActivities.length < 10) {
      throw new Error('Not enough data to establish baseline. Minimum 10 activities required.');
    }

    const actions = agentActivities.map(a => a.action);
    const resources = agentActivities.map(a => a.resource);
    
    // Calculate typical actions (appearing in more than 20% of activities)
    const actionCounts = this.countOccurrences(actions);
    const typicalActions = Object.entries(actionCounts)
      .filter(([_, count]) => count / actions.length > 0.2)
      .map(([action]) => action);

    // Calculate typical resources
    const resourceCounts = this.countOccurrences(resources);
    const typicalResources = Object.entries(resourceCounts)
      .filter(([_, count]) => count / resources.length > 0.2)
      .map(([resource]) => resource);

    // Calculate average actions per hour
    const timeSpan = agentActivities.length > 0 
      ? (agentActivities[agentActivities.length - 1].timestamp.getTime() - agentActivities[0].timestamp.getTime()) / (1000 * 60 * 60)
      : 1;
    const averageActionsPerHour = agentActivities.length / Math.max(timeSpan, 1);

    const baseline: BehavioralBaseline = {
      agentId,
      typicalActions,
      typicalResources,
      averageActionsPerHour,
      lastUpdated: new Date(),
    };

    this.baselines.set(agentId, baseline);
    return baseline;
  }

  /**
   * Check for behavioral drift - Problem #2, #11: Behavioral Drift & Anomaly Alerts
   */
  private checkBehavioralDrift(activity: AgentActivity): void {
    const baseline = this.baselines.get(activity.agentId);
    
    if (!baseline) {
      return; // No baseline established yet
    }

    // Check if action is atypical
    if (!baseline.typicalActions.includes(activity.action)) {
      this.createAnomaly({
        severity: 'medium',
        type: 'behavioral_drift',
        message: `Agent ${activity.agentId} performed atypical action: ${activity.action}`,
        agentId: activity.agentId,
        details: {
          action: activity.action,
          resource: activity.resource,
          typicalActions: baseline.typicalActions,
        },
      });
    }

    // Check if resource is atypical
    if (!baseline.typicalResources.includes(activity.resource)) {
      this.createAnomaly({
        severity: 'medium',
        type: 'resource_anomaly',
        message: `Agent ${activity.agentId} accessed atypical resource: ${activity.resource}`,
        agentId: activity.agentId,
        details: {
          resource: activity.resource,
          action: activity.action,
          typicalResources: baseline.typicalResources,
        },
      });
    }
  }

  /**
   * Create anomaly alert - Problem #11: No Anomaly Alerts When Behavior Changes
   */
  private createAnomaly(alert: Omit<AnomalyAlert, 'id' | 'timestamp'>): AnomalyAlert {
    const fullAlert: AnomalyAlert = {
      ...alert,
      id: `anom_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date(),
    };
    
    this.anomalies.push(fullAlert);
    
    // Limit stored anomalies
    if (this.anomalies.length > 1000) {
      this.anomalies = this.anomalies.slice(-1000);
    }
    
    return fullAlert;
  }

  /**
   * Get recent anomalies
   */
  getAnomalies(limit: number = 50): AnomalyAlert[] {
    return this.anomalies.slice(-limit).reverse();
  }

  /**
   * Export audit log for compliance - Problem #15
   */
  exportAuditLog(agentId?: string, startDate?: Date, endDate?: Date): string {
    let filtered = this.activities;
    
    if (agentId) {
      filtered = filtered.filter(a => a.agentId === agentId);
    }
    
    if (startDate) {
      filtered = filtered.filter(a => a.timestamp >= startDate);
    }
    
    if (endDate) {
      filtered = filtered.filter(a => a.timestamp <= endDate);
    }

    return JSON.stringify({
      exportDate: new Date().toISOString(),
      activityCount: filtered.length,
      activities: filtered,
    }, null, 2);
  }

  /**
   * Utility: Count occurrences in array
   */
  private countOccurrences(arr: string[]): Record<string, number> {
    return arr.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Clear old data (for memory management)
   */
  clearOldData(daysToKeep: number = 30): void {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    this.activities = this.activities.filter(a => a.timestamp >= cutoffDate);
    this.anomalies = this.anomalies.filter(a => a.timestamp >= cutoffDate);
  }

  resetAgent(agentId: string): void {
    this.activities = this.activities.filter(a => a.agentId !== agentId);
    this.anomalies = this.anomalies.filter(a => a.agentId !== agentId);
    this.baselines.delete(agentId);
  }

  getActivityReport(agentId: string) {
    const activities = this.activities.filter(a => a.agentId === agentId);
    return {
      totalActions: activities.length,
      recentActivities: activities.slice(-20).reverse(),
      successCount: activities.filter(a => a.outcome === 'success').length,
      failureCount: activities.filter(a => a.outcome === 'failure').length,
      blockedCount: activities.filter(a => a.outcome === 'blocked').length,
    };
  }

  getBaseline(agentId: string) {
    const activities = this.activities.filter(a => a.agentId === agentId);
    if (activities.length < 10) return undefined;
    const baselineActivities = activities.slice(0, Math.max(10, Math.floor(activities.length / 2)));
    const actions = baselineActivities.map(a => a.action);
    const resources = baselineActivities.map(a => a.resource);
    const actionCounts = this.countOccurrences(actions);
    const resourceCounts = this.countOccurrences(resources);
    const baseline: BehavioralBaseline = {
      agentId,
      typicalActions: Object.entries(actionCounts).filter(([, count]) => count / actions.length > 0.2).map(([action]) => action),
      typicalResources: Object.entries(resourceCounts).filter(([, count]) => count / resources.length > 0.2).map(([resource]) => resource),
      averageActionsPerHour: baselineActivities.length,
      lastUpdated: new Date(),
    };
    return {
      ...baseline,
      actionsPerMinute: baseline.averageActionsPerHour / 60,
    };
  }

  analyzeDrift(agentId: string) {
    const activities = this.activities.filter(a => a.agentId === agentId);
    if (activities.length < 10) {
      return { hasDrift: false, sigma: 0 };
    }
    const baselineSample = activities.slice(0, Math.min(20, activities.length));
    const recent = activities.slice(-20);
    const baselineActions = new Set(baselineSample.map(a => a.action));
    const unusual = recent.filter(a => !baselineActions.has(a.action)).length;
    const ratio = unusual / Math.max(recent.length, 1);
    const sigma = Number((ratio * 12).toFixed(2));
    return { hasDrift: sigma > 2, sigma };
  }

  detectRunawayLoop(agentId: string, timeWindowMinutes: number = 5, threshold: number = 50) {
    const windowStart = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    const recentActivities = this.activities.filter(
      a => a.agentId === agentId && a.timestamp >= windowStart
    );

    const actionsPerMinute = recentActivities.length;
    const isRunaway = recentActivities.length > threshold;

    if (isRunaway) {
      this.createAnomaly({
        severity: 'critical',
        type: 'runaway_loop',
        message: `Agent ${agentId} executed ${recentActivities.length} actions in ${timeWindowMinutes} minutes`,
        agentId,
        details: { activityCount: recentActivities.length, timeWindow: timeWindowMinutes, threshold },
      });
    }

    return { isRunaway, actionsPerMinute };
  }

  exportComplianceLog(agentId: string) {
    const activities = this.activities.filter(a => a.agentId === agentId);
    return {
      agentId,
      exportTimestamp: new Date().toISOString(),
      activities,
    };
  }

  detectAnomalies(agentId: string) {
    const activities = this.activities.filter(a => a.agentId === agentId);
    if (activities.length === 0) return [];
    const baseline = this.getBaseline(agentId);
    if (!baseline) return [];
    const anomalies = activities.slice(-10).filter(a => !baseline.typicalActions.includes(a.action));
    return anomalies.map(a => ({ type: 'behaviorChange', action: a.action, resource: a.resource }));
  }
}

// Singleton instance
export const agentMonitor = new AgentMonitor();
