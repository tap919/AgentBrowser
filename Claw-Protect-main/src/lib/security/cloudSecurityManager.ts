/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Cloud-Native Security Manager - Addresses 2026 Trend: Cloud Security & Continuous Monitoring
// Multi-cloud identity federation, IAM analysis, serverless monitoring, container security

export interface CloudIdentity {
  identityId: string;
  provider: 'aws' | 'azure' | 'gcp' | 'multi-cloud';
  principalType: 'user' | 'service-account' | 'role' | 'group' | 'federated';
  principalName: string;
  permissions: string[];
  createdAt: Date;
  lastUsed?: Date;
  isActive: boolean;
}

export interface IAMAnalysis {
  identityId: string;
  excessivePermissions: string[];
  unusedPermissions: string[];
  dangerousPermissions: string[];
  riskScore: number; // 0-100
  recommendations: string[];
  lastAnalyzed: Date;
}

export interface ServerlessFunction {
  functionId: string;
  provider: 'aws-lambda' | 'azure-functions' | 'gcp-cloud-functions';
  name: string;
  runtime: string;
  memoryMB: number;
  timeout: number;
  iamRole?: string;
  environmentVariables: Map<string, string>;
  invocations: number;
  errors: number;
  lastInvoked?: Date;
}

export interface ServerlessSecurityIssue {
  id: string;
  functionId: string;
  issueType: 'exposed-secret' | 'excessive-permissions' | 'vulnerable-dependency' | 'insecure-config' | 'cold-start-attack';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  detectedAt: Date;
}

export interface ContainerScan {
  containerId: string;
  imageName: string;
  imageTag: string;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  malwareDetected: boolean;
  secretsFound: string[];
  lastScanned: Date;
  scanStatus: 'passed' | 'failed' | 'warnings';
}

export interface MultiCloudSession {
  sessionId: string;
  userId: string;
  federatedFrom: string;
  activeClouds: ('aws' | 'azure' | 'gcp')[];
  assumedRoles: string[];
  createdAt: Date;
  lastActivity: Date;
  isSuspicious: boolean;
  suspicionReasons: string[];
}

class CloudSecurityManager {
  private cloudIdentities: Map<string, CloudIdentity> = new Map();
  private iamAnalyses: Map<string, IAMAnalysis> = new Map();
  private serverlessFunctions: Map<string, ServerlessFunction> = new Map();
  private serverlessIssues: ServerlessSecurityIssue[] = [];
  private containerScans: Map<string, ContainerScan> = new Map();
  private multiCloudSessions: Map<string, MultiCloudSession> = new Map();

  // Dangerous permissions that require special scrutiny
  private readonly DANGEROUS_PERMISSIONS = {
    aws: [
      'iam:*',
      'iam:CreateUser',
      'iam:CreateAccessKey',
      'iam:AttachUserPolicy',
      's3:*',
      'ec2:*',
      'lambda:*',
      'dynamodb:*',
      'secretsmanager:GetSecretValue',
    ],
    azure: [
      'Microsoft.Authorization/*',
      'Microsoft.Compute/virtualMachines/*',
      'Microsoft.Storage/storageAccounts/*',
      'Microsoft.KeyVault/vaults/secrets/read',
    ],
    gcp: [
      'iam.serviceAccounts.actAs',
      'iam.serviceAccountKeys.create',
      'storage.buckets.*',
      'compute.instances.*',
    ],
  };

  /**
   * Register cloud identity
   */
  registerCloudIdentity(identity: CloudIdentity): CloudIdentity {
    this.cloudIdentities.set(identity.identityId, identity);
    
    // Automatically analyze IAM permissions
    this.analyzeIAMPermissions(identity.identityId);
    
    return identity;
  }

  /**
   * Analyze IAM permissions for over-privileged access
   */
  analyzeIAMPermissions(identityId: string): IAMAnalysis | null {
    const identity = this.cloudIdentities.get(identityId);
    if (!identity) return null;

    const excessivePermissions: string[] = [];
    const unusedPermissions: string[] = [];
    const dangerousPermissions: string[] = [];

    // Check for wildcard permissions (excessive)
    identity.permissions.forEach(permission => {
      if (permission.includes('*')) {
        excessivePermissions.push(permission);
      }
    });

    // Check for dangerous permissions with proper wildcard matching
    const dangerousSet = this.getDangerousPermissionsForProvider(identity.provider);
    identity.permissions.forEach(permission => {
      if (dangerousSet.some(dangerous => {
        // Exact match
        if (permission === dangerous) return true;
        
        // Wildcard matching: convert pattern to regex for proper matching
        // e.g., "s3:*" matches "s3:GetObject", "iam:*" matches "iam:CreateUser"
        const pattern = dangerous.split('*').map(part => 
          part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
        ).join('.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(permission);
      })) {
        dangerousPermissions.push(permission);
      }
    });

    // Check for unused permissions (simplified - would need usage data)
    if (identity.lastUsed) {
      const daysSinceLastUse = (Date.now() - identity.lastUsed.getTime()) / (24 * 60 * 60 * 1000);
      if (daysSinceLastUse > 90) {
        unusedPermissions.push(...identity.permissions);
      }
    }

    // Calculate risk score
    let riskScore = 0;
    riskScore += excessivePermissions.length * 15;
    riskScore += dangerousPermissions.length * 20;
    riskScore += unusedPermissions.length * 5;
    riskScore = Math.min(100, riskScore);

    // Generate recommendations
    const recommendations: string[] = [];
    if (excessivePermissions.length > 0) {
      recommendations.push(`Remove ${excessivePermissions.length} wildcard permissions - apply least privilege principle`);
    }
    if (dangerousPermissions.length > 0) {
      recommendations.push(`Review ${dangerousPermissions.length} dangerous permissions - ensure business justification`);
    }
    if (unusedPermissions.length > 0) {
      recommendations.push(`Remove ${unusedPermissions.length} unused permissions - identity inactive for 90+ days`);
    }
    if (identity.principalType === 'user' && dangerousPermissions.length > 0) {
      recommendations.push('Consider using service accounts instead of user credentials for automated tasks');
    }

    const analysis: IAMAnalysis = {
      identityId,
      excessivePermissions,
      unusedPermissions,
      dangerousPermissions,
      riskScore,
      recommendations,
      lastAnalyzed: new Date(),
    };

    this.iamAnalyses.set(identityId, analysis);
    return analysis;
  }

  /**
   * Get dangerous permissions for cloud provider
   */
  private getDangerousPermissionsForProvider(provider: CloudIdentity['provider']): string[] {
    switch (provider) {
      case 'aws':
        return this.DANGEROUS_PERMISSIONS.aws;
      case 'azure':
        return this.DANGEROUS_PERMISSIONS.azure;
      case 'gcp':
        return this.DANGEROUS_PERMISSIONS.gcp;
      case 'multi-cloud':
        return [
          ...this.DANGEROUS_PERMISSIONS.aws,
          ...this.DANGEROUS_PERMISSIONS.azure,
          ...this.DANGEROUS_PERMISSIONS.gcp,
        ];
      default:
        return [];
    }
  }

  /**
   * Register serverless function for monitoring
   */
  registerServerlessFunction(func: ServerlessFunction): ServerlessFunction {
    this.serverlessFunctions.set(func.functionId, func);
    
    // Automatically scan for security issues
    this.scanServerlessFunction(func.functionId);
    
    return func;
  }

  /**
   * Scan serverless function for security issues
   */
  scanServerlessFunction(functionId: string): ServerlessSecurityIssue[] {
    const func = this.serverlessFunctions.get(functionId);
    if (!func) return [];

    const issues: ServerlessSecurityIssue[] = [];

    // Check for exposed secrets in environment variables
    func.environmentVariables.forEach((value, key) => {
      if (this.looksLikeSecret(value)) {
        issues.push({
          id: `issue_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`,
          functionId,
          issueType: 'exposed-secret',
          severity: 'critical',
          description: `Potential secret found in environment variable: ${key}`,
          recommendation: 'Use AWS Secrets Manager, Azure Key Vault, or GCP Secret Manager instead',
          detectedAt: new Date(),
        });
      }
    });

    // Check for excessive IAM permissions
    if (func.iamRole && func.iamRole.includes('*')) {
      issues.push({
        id: `issue_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`,
        functionId,
        issueType: 'excessive-permissions',
        severity: 'high',
        description: 'Function has wildcard IAM permissions',
        recommendation: 'Apply least privilege - grant only necessary permissions',
        detectedAt: new Date(),
      });
    }

    // Check for long timeout (potential for abuse)
    if (func.timeout > 300) {
      issues.push({
        id: `issue_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`,
        functionId,
        issueType: 'insecure-config',
        severity: 'medium',
        description: `Function timeout is ${func.timeout} seconds (very long)`,
        recommendation: 'Reduce timeout to minimum necessary to prevent resource exhaustion attacks',
        detectedAt: new Date(),
      });
    }

    // Check for high error rate (potential attack or vulnerability)
    if (func.invocations > 100 && func.errors / func.invocations > 0.1) {
      issues.push({
        id: `issue_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`,
        functionId,
        issueType: 'insecure-config',
        severity: 'medium',
        description: `High error rate: ${((func.errors / func.invocations) * 100).toFixed(1)}%`,
        recommendation: 'Investigate errors - may indicate attack attempts or vulnerabilities',
        detectedAt: new Date(),
      });
    }

    // Store issues
    issues.forEach(issue => this.serverlessIssues.push(issue));

    // Limit stored issues
    if (this.serverlessIssues.length > 1000) {
      this.serverlessIssues = this.serverlessIssues.slice(-1000);
    }

    return issues;
  }

  /**
   * Simple heuristic to detect potential secrets
   */
  private looksLikeSecret(value: string): boolean {
    // Check for common secret patterns
    const secretPatterns = [
      /^sk-[a-zA-Z0-9]{32,}/, // OpenAI API key
      /^xox[baprs]-[a-zA-Z0-9-]+/, // Slack token
      /^ghp_[a-zA-Z0-9]{36}/, // GitHub token
      /AKIA[0-9A-Z]{16}/, // AWS access key
      /^[A-Za-z0-9+/]{40,}={0,2}$/, // Base64 encoded (potential key)
    ];

    return secretPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Scan container image for vulnerabilities
   */
  scanContainer(scan: Omit<ContainerScan, 'lastScanned' | 'scanStatus'>): ContainerScan {
    const totalVulns = scan.vulnerabilities.critical + 
                      scan.vulnerabilities.high + 
                      scan.vulnerabilities.medium + 
                      scan.vulnerabilities.low;

    let scanStatus: ContainerScan['scanStatus'] = 'passed';
    if (scan.malwareDetected || scan.vulnerabilities.critical > 0) {
      scanStatus = 'failed';
    } else if (scan.vulnerabilities.high > 0 || scan.secretsFound.length > 0) {
      scanStatus = 'warnings';
    }

    const fullScan: ContainerScan = {
      ...scan,
      lastScanned: new Date(),
      scanStatus,
    };

    this.containerScans.set(scan.containerId, fullScan);
    return fullScan;
  }

  /**
   * Create multi-cloud federated session
   */
  createMultiCloudSession(session: Omit<MultiCloudSession, 'lastActivity' | 'isSuspicious' | 'suspicionReasons'>): MultiCloudSession {
    const suspicionReasons: string[] = [];
    
    // Check for suspicious patterns
    if (session.activeClouds.length > 2) {
      suspicionReasons.push('Accessing 3+ cloud providers simultaneously');
    }

    if (session.assumedRoles.some(role => role.includes('admin') || role.includes('root'))) {
      suspicionReasons.push('Assumed administrative role');
    }

    const fullSession: MultiCloudSession = {
      ...session,
      lastActivity: new Date(),
      isSuspicious: suspicionReasons.length > 0,
      suspicionReasons,
    };

    this.multiCloudSessions.set(session.sessionId, fullSession);
    return fullSession;
  }

  /**
   * Update multi-cloud session activity
   */
  updateMultiCloudActivity(sessionId: string, newClouds?: ('aws' | 'azure' | 'gcp')[]): boolean {
    const session = this.multiCloudSessions.get(sessionId);
    if (!session) return false;

    session.lastActivity = new Date();
    
    if (newClouds) {
      session.activeClouds = [...new Set([...session.activeClouds, ...newClouds])];
      
      // Re-check suspicion
      if (session.activeClouds.length > 2 && !session.suspicionReasons.includes('Accessing 3+ cloud providers simultaneously')) {
        session.suspicionReasons.push('Accessing 3+ cloud providers simultaneously');
        session.isSuspicious = true;
      }
    }

    this.multiCloudSessions.set(sessionId, session);
    return true;
  }

  /**
   * Get IAM analysis for identity
   */
  getIAMAnalysis(identityId: string): IAMAnalysis | null {
    return this.iamAnalyses.get(identityId) || null;
  }

  /**
   * Get all high-risk identities
   */
  getHighRiskIdentities(minRiskScore: number = 60): IAMAnalysis[] {
    return Array.from(this.iamAnalyses.values()).filter(
      analysis => analysis.riskScore >= minRiskScore
    );
  }

  /**
   * Get serverless security issues
   */
  getServerlessIssues(severity?: ServerlessSecurityIssue['severity']): ServerlessSecurityIssue[] {
    if (severity) {
      return this.serverlessIssues.filter(issue => issue.severity === severity);
    }
    return this.serverlessIssues;
  }

  /**
   * Get container scan results
   */
  getContainerScans(status?: ContainerScan['scanStatus']): ContainerScan[] {
    const scans = Array.from(this.containerScans.values());
    if (status) {
      return scans.filter(scan => scan.scanStatus === status);
    }
    return scans;
  }

  /**
   * Get suspicious multi-cloud sessions
   */
  getSuspiciousSessions(): MultiCloudSession[] {
    return Array.from(this.multiCloudSessions.values()).filter(
      session => session.isSuspicious
    );
  }

  /**
   * Get statistics for monitoring
   */
  getStatistics() {
    const identities = Array.from(this.cloudIdentities.values());
    const analyses = Array.from(this.iamAnalyses.values());
    const highRiskIdentities = analyses.filter(a => a.riskScore >= 60);
    
    const recentIssues = this.serverlessIssues.filter(
      issue => Date.now() - issue.detectedAt.getTime() < 24 * 60 * 60 * 1000
    );
    
    const scans = Array.from(this.containerScans.values());
    const failedScans = scans.filter(s => s.scanStatus === 'failed');
    
    const sessions = Array.from(this.multiCloudSessions.values());
    const activeSessions = sessions.filter(
      s => Date.now() - s.lastActivity.getTime() < 60 * 60 * 1000 // Last hour
    );

    return {
      totalIdentities: identities.length,
      highRiskIdentities: highRiskIdentities.length,
      avgRiskScore: analyses.length > 0
        ? Math.round(analyses.reduce((sum, a) => sum + a.riskScore, 0) / analyses.length)
        : 0,
      serverlessFunctions: this.serverlessFunctions.size,
      serverlessIssuesLast24h: recentIssues.length,
      criticalServerlessIssues: recentIssues.filter(i => i.severity === 'critical').length,
      totalContainers: scans.length,
      failedContainerScans: failedScans.length,
      containersWithCriticalVulns: scans.filter(s => s.vulnerabilities.critical > 0).length,
      multiCloudSessions: sessions.length,
      activeMultiCloudSessions: activeSessions.length,
      suspiciousSessions: sessions.filter(s => s.isSuspicious).length,
    };
  }

  /**
   * Generate least-privilege IAM policy recommendation
   */
  generateLeastPrivilegePolicy(identityId: string): {
    currentPermissions: string[];
    recommendedPermissions: string[];
    removedPermissions: string[];
  } | null {
    const analysis = this.iamAnalyses.get(identityId);
    const identity = this.cloudIdentities.get(identityId);
    
    if (!analysis || !identity) return null;

    const currentPermissions = identity.permissions;
    const toRemove = [
      ...analysis.excessivePermissions,
      ...analysis.unusedPermissions,
    ];

    const recommendedPermissions = currentPermissions.filter(
      permission => !toRemove.includes(permission)
    );

    return {
      currentPermissions,
      recommendedPermissions,
      removedPermissions: toRemove,
    };
  }
}

// Export singleton instance
export const cloudSecurityManager = new CloudSecurityManager();
