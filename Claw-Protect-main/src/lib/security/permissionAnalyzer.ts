/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Permission Analyzer - Addresses Problem #4: Excessive Permissions / Privilege Creep
// Analyzes agent permissions and recommends least-privilege configurations

export interface Permission {
  resource: string;
  actions: string[];
  granted: Date;
  lastUsed?: Date;
  usageCount: number;
}

export interface AgentPermissions {
  agentId: string;
  permissions: Permission[];
  role: 'admin' | 'user' | 'service' | 'custom';
  createdAt: Date;
  lastReviewed?: Date;
}

export interface PermissionRecommendation {
  agentId: string;
  type: 'remove' | 'downgrade' | 'keep';
  permission: Permission;
  reason: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

class PermissionAnalyzer {
  private agentPermissions: Map<string, AgentPermissions> = new Map();
  private UNUSED_THRESHOLD_DAYS = 30;
  private LOW_USAGE_THRESHOLD = 5;

  /**
   * Register agent permissions - Problem #4: Excessive Permissions
   */
  registerAgent(agentId: string, permissions: Omit<Permission, 'granted' | 'usageCount'>[], role: AgentPermissions['role']): AgentPermissions {
    const agentPerms: AgentPermissions = {
      agentId,
      permissions: permissions.map(p => ({
        ...p,
        granted: new Date(),
        usageCount: 0,
      })),
      role,
      createdAt: new Date(),
    };

    this.agentPermissions.set(agentId, agentPerms);
    return agentPerms;
  }

  /**
   * Log permission usage
   */
  private logPermissionUseInternal(agentId: string, resource: string, action: string): void {
    const agent = this.agentPermissions.get(agentId);
    if (!agent) return;

    const permission = agent.permissions.find(
      p => p.resource === resource && p.actions.includes(action)
    );

    if (permission) {
      permission.lastUsed = new Date();
      permission.usageCount++;
    }
  }

  /**
   * Analyze permissions and generate recommendations - Problem #4
   */
  analyzePermissions(agentId: string): PermissionRecommendation[] {
    const agent = this.agentPermissions.get(agentId);
    if (!agent) {
      return [];
    }

    const recommendations: PermissionRecommendation[] = [];
    const now = new Date();

    for (const permission of agent.permissions) {
      // Check for unused permissions
      if (!permission.lastUsed) {
        const daysSinceGranted = (now.getTime() - permission.granted.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceGranted > this.UNUSED_THRESHOLD_DAYS) {
          recommendations.push({
            agentId,
            type: 'remove',
            permission,
            reason: `Permission never used in ${Math.floor(daysSinceGranted)} days since granted`,
            riskLevel: 'medium',
          });
        }
      } else {
        // Check for rarely used permissions
        const daysSinceLastUse = (now.getTime() - permission.lastUsed.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceLastUse > this.UNUSED_THRESHOLD_DAYS && permission.usageCount < this.LOW_USAGE_THRESHOLD) {
          recommendations.push({
            agentId,
            type: 'remove',
            permission,
            reason: `Permission used only ${permission.usageCount} times and not accessed in ${Math.floor(daysSinceLastUse)} days`,
            riskLevel: 'low',
          });
        }
      }

      // Check for overly broad permissions
      if (permission.resource === '*' || permission.actions.includes('*')) {
        recommendations.push({
          agentId,
          type: 'downgrade',
          permission,
          reason: 'Wildcard permissions detected. Recommend specific resource/action grants.',
          riskLevel: 'high',
        });
      }

      // Check for dangerous permission combinations
      if (
        permission.actions.includes('delete') && 
        permission.actions.includes('write') &&
        permission.actions.includes('read')
      ) {
        recommendations.push({
          agentId,
          type: 'downgrade',
          permission,
          reason: 'Agent has full CRUD access. Consider splitting into separate permissions.',
          riskLevel: 'medium',
        });
      }
    }

    // Check for admin role misuse
    if (agent.role === 'admin') {
      const hasAdminUsage = agent.permissions.some(
        p => p.usageCount > 0 && (p.resource === 'system' || p.actions.includes('admin'))
      );
      
      if (!hasAdminUsage) {
        recommendations.push({
          agentId,
          type: 'downgrade',
          permission: { resource: 'role', actions: ['admin'], granted: agent.createdAt, usageCount: 0 },
          reason: 'Agent has admin role but never uses admin-level permissions',
          riskLevel: 'high',
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate least-privilege configuration
   */
  generateLeastPrivilegeConfig(agentId: string): AgentPermissions | null {
    const agent = this.agentPermissions.get(agentId);
    if (!agent) return null;

    // Only keep permissions that have been used
    const usedPermissions = agent.permissions.filter(p => p.usageCount > 0);

    return {
      ...agent,
      permissions: usedPermissions,
      role: usedPermissions.length > 0 ? 'custom' : 'user',
      lastReviewed: new Date(),
    };
  }

  /**
   * Get all over-permissioned agents
   */
  getOverPermissionedAgents(): Array<{ agentId: string; excessPermissions: number; role: string }> {
    const results: Array<{ agentId: string; excessPermissions: number; role: string }> = [];

    for (const [agentId, agent] of this.agentPermissions) {
      const recommendations = this.analyzePermissions(agentId);
      const excessCount = recommendations.filter(r => r.type === 'remove' || r.type === 'downgrade').length;
      
      if (excessCount > 0) {
        results.push({
          agentId,
          excessPermissions: excessCount,
          role: agent.role,
        });
      }
    }

    return results.sort((a, b) => b.excessPermissions - a.excessPermissions);
  }

  /**
   * Audit permissions for compliance
   */
  auditPermissions(agentId?: string): {
    totalAgents: number;
    totalPermissions: number;
    unusedPermissions: number;
    adminAgents: number;
    recommendations: number;
  } {
    let totalPermissions = 0;
    let unusedPermissions = 0;
    let adminAgents = 0;
    let totalRecommendations = 0;

    const agentsToAudit = agentId 
      ? [this.agentPermissions.get(agentId)].filter(Boolean) as AgentPermissions[]
      : Array.from(this.agentPermissions.values());

    for (const agent of agentsToAudit) {
      totalPermissions += agent.permissions.length;
      unusedPermissions += agent.permissions.filter(p => p.usageCount === 0).length;
      
      if (agent.role === 'admin') {
        adminAgents++;
      }

      const recs = this.analyzePermissions(agent.agentId);
      totalRecommendations += recs.length;
    }

    return {
      totalAgents: agentsToAudit.length,
      totalPermissions,
      unusedPermissions,
      adminAgents,
      recommendations: totalRecommendations,
    };
  }

  /**
   * Get agent permissions
   */
  getAgentPermissions(agentId: string): AgentPermissions | undefined {
    return this.agentPermissions.get(agentId);
  }

  /**
   * Update permission review timestamp
   */
  markAsReviewed(agentId: string): void {
    const agent = this.agentPermissions.get(agentId);
    if (agent) {
      agent.lastReviewed = new Date();
    }
  }

  clearAgent(agentId: string): void {
    this.agentPermissions.delete(agentId);
  }

  grantPermissions(agentId: string, permissions: string[]): void {
    const mapped = permissions.map(permission => {
      const [resource, action] = permission.includes(':') ? permission.split(':', 2) : [permission, permission];
      return { resource, actions: [action] };
    });
    this.registerAgent(agentId, mapped, 'custom');
  }

  getUsageReport(agentId: string) {
    const agent = this.agentPermissions.get(agentId);
    if (!agent) {
      return { permissionsUsed: [] as string[] };
    }
    const used = agent.permissions.filter(p => p.usageCount > 0).map(p => `${p.resource}:${p.actions[0] || '*'}`);
    return { permissionsUsed: used };
  }

  analyzeLeastPrivilege(agentId: string, _days: number = 30) {
    const agent = this.agentPermissions.get(agentId);
    if (!agent) {
      return { unusedPermissions: [] as string[], overPermissionScore: 0 };
    }
    const unusedPermissions = agent.permissions
      .filter(p => p.usageCount === 0)
      .map(p => `${p.resource}:${p.actions[0] || '*'}`);
    const overPermissionScore = Math.round((unusedPermissions.length / Math.max(agent.permissions.length, 1)) * 100);
    return { unusedPermissions, overPermissionScore };
  }

  getRecommendations(agentId: string): string[] {
    const analysis = this.analyzeLeastPrivilege(agentId);
    if (analysis.unusedPermissions.length === 0) return [];
    return [`Remove unused permissions: ${analysis.unusedPermissions.join(', ')}`];
  }

  logPermissionUse(agentId: string, permission: string, resourceHint: string): void {
    const [resource, action] = permission.includes(':') ? permission.split(':', 2) : [permission, permission];
    if (!this.agentPermissions.has(agentId)) {
      this.grantPermissions(agentId, [permission]);
    }
    const agent = this.agentPermissions.get(agentId);
    const existing = agent?.permissions.find(p => p.resource === resource && p.actions.includes(action));
    if (!existing && agent) {
      agent.permissions.push({ resource, actions: [action], granted: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), usageCount: 0 });
    }
    this.logPermissionUseInternal(agentId, resource, action);
  }
}

// Singleton instance
export const permissionAnalyzer = new PermissionAnalyzer();
