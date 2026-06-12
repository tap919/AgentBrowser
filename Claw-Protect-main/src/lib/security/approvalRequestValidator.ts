/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Approval Request Validator - Addresses Problem #12: Approval Fatigue / Misleading Agent Summaries
// Validates action requests against agent task scope and detects misleading summaries

export interface ActionRequest {
  id: string;
  agentId: string;
  timestamp: Date;
  action: string;
  resource: string;
  summary: string;
  fullDetails: string;
  requiresApproval: boolean;
}

export interface ValidationResult {
  request: ActionRequest;
  isValid: boolean;
  isMisleading: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  warnings: string[];
  recommendation: 'approve' | 'review' | 'reject';
}

export interface AgentTaskScope {
  agentId: string;
  allowedActions: string[];
  allowedResources: string[];
  prohibitedActions: string[];
  description: string;
}

class ApprovalRequestValidator {
  private taskScopes: Map<string, AgentTaskScope> = new Map();
  private requestHistory: ActionRequest[] = [];

  // Dangerous actions that should always be flagged
  private dangerousKeywords = [
    'delete', 'remove', 'drop', 'truncate', 'destroy',
    'format', 'wipe', 'erase', 'ransomware', 'encrypt',
    'chmod 777', 'sudo', 'admin', 'root', 'privilege',
    'password', 'credential', 'token', 'secret',
    'install', 'execute', 'run', 'download', 'curl', 'wget',
  ];

  /**
   * Register agent task scope - Problem #12: Approval Fatigue
   */
  registerAgentScope(scope: AgentTaskScope): void {
    this.taskScopes.set(scope.agentId, scope);
  }

  /**
   * Validate action request against task scope
   */
  validateRequest(request: Omit<ActionRequest, 'id' | 'timestamp'>): ValidationResult {
    const fullRequest: ActionRequest = {
      ...request,
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date(),
    };

    this.requestHistory.push(fullRequest);

    return this.evaluateRequest(fullRequest);
  }

  /**
   * Evaluate a request without mutating history
   */
  private evaluateRequest(request: ActionRequest): ValidationResult {
    const scope = this.taskScopes.get(request.agentId);
    const warnings: string[] = [];
    let riskLevel: ValidationResult['riskLevel'] = 'low';
    let isMisleading = false;

    // Check if action is within scope
    if (scope) {
      if (scope.prohibitedActions.includes(request.action)) {
        warnings.push(`Action '${request.action}' is explicitly prohibited for this agent`);
        riskLevel = 'critical';
      }

      if (scope.allowedActions.length > 0 && !scope.allowedActions.includes(request.action)) {
        warnings.push(`Action '${request.action}' is not in agent's allowed actions list`);
        riskLevel = 'high';
      }

      if (scope.allowedResources.length > 0 && !scope.allowedResources.includes(request.resource)) {
        warnings.push(`Resource '${request.resource}' is not in agent's allowed resources list`);
        riskLevel = riskLevel === 'critical' ? 'critical' : 'medium';
      }
    }

    // Check for misleading summary - Problem #12
    const summaryMismatch = this.detectMisleadingSummary(
      request.summary,
      request.fullDetails,
      request.action
    );
    
    if (summaryMismatch.length > 0) {
      warnings.push(...summaryMismatch);
      isMisleading = true;
      riskLevel = 'high';
    }

    // Check for dangerous actions
    const dangerousCheck = this.checkDangerousAction(request.action, request.fullDetails);
    if (dangerousCheck.isDangerous) {
      warnings.push(...dangerousCheck.warnings);
      riskLevel = 'critical';
    }

    // Check for truncated details
    if (request.summary.length > request.fullDetails.length * 0.8) {
      warnings.push('Summary is suspiciously long compared to full details');
      isMisleading = true;
    }

    // Check for vague language in summary
    const vaguePatterns = ['troubleshooting', 'fixing issue', 'optimizing', 'improving', 'updating'];
    for (const pattern of vaguePatterns) {
      if (request.summary.toLowerCase().includes(pattern) && !request.fullDetails.toLowerCase().includes(pattern)) {
        warnings.push(`Vague summary term '${pattern}' not reflected in full details`);
        isMisleading = true;
      }
    }

    // Determine recommendation
    let recommendation: ValidationResult['recommendation'] = 'approve';
    if (riskLevel === 'critical' || isMisleading) {
      recommendation = 'reject';
    } else if (riskLevel === 'high' || warnings.length > 0) {
      recommendation = 'review';
    }

    return {
      request,
      isValid: warnings.length === 0,
      isMisleading,
      riskLevel,
      warnings,
      recommendation,
    };
  }

  /**
   * Detect misleading summary compared to full details
   */
  private detectMisleadingSummary(summary: string, fullDetails: string, action: string): string[] {
    const warnings: string[] = [];

    // Check if dangerous keywords are in details but not summary
    for (const keyword of this.dangerousKeywords) {
      if (fullDetails.toLowerCase().includes(keyword) && !summary.toLowerCase().includes(keyword)) {
        warnings.push(`Dangerous action '${keyword}' hidden in details but not mentioned in summary`);
      }
    }

    // Check if action type matches summary
    const actionWords = action.toLowerCase().split(/[_\s-]+/);
    const summaryWords = summary.toLowerCase().split(/\s+/);
    
    const actionInSummary = actionWords.some(word => summaryWords.includes(word));
    if (!actionInSummary && action.length > 3) {
      warnings.push('Action type not clearly described in summary');
    }

    // Check for sentiment mismatch (simple heuristic)
    const positiveWords = ['fix', 'improve', 'optimize', 'help', 'troubleshoot'];
    const negativeWords = ['delete', 'remove', 'destroy', 'wipe', 'erase'];
    
    const summaryPositive = positiveWords.some(word => summary.toLowerCase().includes(word));
    const detailsNegative = negativeWords.some(word => fullDetails.toLowerCase().includes(word));
    
    if (summaryPositive && detailsNegative) {
      warnings.push('Summary has positive framing but details contain destructive actions');
    }

    return warnings;
  }

  /**
   * Check if action is dangerous
   */
  private checkDangerousAction(action: string, details: string): { isDangerous: boolean; warnings: string[] } {
    const warnings: string[] = [];
    const combined = `${action} ${details}`.toLowerCase();

    for (const keyword of this.dangerousKeywords) {
      if (combined.includes(keyword)) {
        warnings.push(`Dangerous keyword detected: '${keyword}'`);
      }
    }

    // Check for system commands
    const systemCommands = ['rm -rf', 'del /f', 'format', 'mkfs', 'dd if='];
    for (const cmd of systemCommands) {
      if (combined.includes(cmd)) {
        warnings.push(`Dangerous system command detected: '${cmd}'`);
      }
    }

    // Check for credential access
    const credentialPatterns = ['.env', 'password', 'api_key', 'secret', 'token', 'credentials.json'];
    for (const pattern of credentialPatterns) {
      if (combined.includes(pattern)) {
        warnings.push(`Potential credential access: '${pattern}'`);
      }
    }

    return {
      isDangerous: warnings.length > 0,
      warnings,
    };
  }

  /**
   * Get request history
   */
  getRequestHistory(agentId?: string, limit: number = 100): ActionRequest[] {
    let filtered = this.requestHistory;
    
    if (agentId) {
      filtered = filtered.filter(r => r.agentId === agentId);
    }

    return filtered.slice(-limit).reverse();
  }

  /**
   * Get rejected/flagged requests
   */
  getFlaggedRequests(agentId?: string, limit: number = 50): ValidationResult[] {
    const flagged: ValidationResult[] = [];

    let requests = this.requestHistory;
    if (agentId) {
      requests = requests.filter(r => r.agentId === agentId);
    }

    for (const request of requests.slice(-limit)) {
      const validation = this.evaluateRequest(request);
      if (validation.recommendation === 'reject' || validation.recommendation === 'review') {
        flagged.push(validation);
      }
    }

    return flagged.reverse();
  }

  /**
   * Generate approval validation report
   */
  generateReport(agentId?: string): {
    totalRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    misleadingRequests: number;
    criticalRisks: number;
    recommendations: string[];
  } {
    let requests = this.requestHistory;
    if (agentId) {
      requests = requests.filter(r => r.agentId === agentId);
    }

    let approved = 0;
    let rejected = 0;
    let misleading = 0;
    let critical = 0;

    for (const request of requests) {
      const validation = this.evaluateRequest(request);
      
      if (validation.recommendation === 'approve') approved++;
      if (validation.recommendation === 'reject') rejected++;
      if (validation.isMisleading) misleading++;
      if (validation.riskLevel === 'critical') critical++;
    }

    const recommendations: string[] = [];
    
    if (misleading > 0) {
      recommendations.push(`Review ${misleading} requests with misleading summaries`);
    }
    
    if (critical > 0) {
      recommendations.push(`URGENT: ${critical} critical-risk requests require immediate attention`);
    }
    
    if (rejected > approved * 0.3) {
      recommendations.push('High rejection rate - consider refining agent task scope');
    }

    recommendations.push('Enable detailed logging for all approval requests');
    recommendations.push('Implement secondary review for critical actions');
    recommendations.push('Train agents to provide transparent action summaries');

    return {
      totalRequests: requests.length,
      approvedRequests: approved,
      rejectedRequests: rejected,
      misleadingRequests: misleading,
      criticalRisks: critical,
      recommendations,
    };
  }

  validate(request: { summary: string; details: string; scope?: string }) {
    const result = this.validateRequest({
      agentId: request.scope || 'legacy-agent',
      action: request.scope || 'unknown',
      resource: request.scope || 'unknown',
      summary: request.summary,
      fullDetails: request.details,
      requiresApproval: true,
    });
    const detailWords = request.details.toLowerCase();
    const scopeTokens = (request.scope || '').toLowerCase().split(/[_\s-]+/).filter(Boolean);
    const hasScopeCreep = scopeTokens.length > 0 && (
      (detailWords.includes('admin') && !scopeTokens.includes('admin')) ||
      (detailWords.includes('delete') && !scopeTokens.includes('delete'))
    );
    return {
      ...result,
      severity: result.riskLevel,
      hasScopeCreep,
    };
  }
}

// Singleton instance
export const approvalRequestValidator = new ApprovalRequestValidator();
