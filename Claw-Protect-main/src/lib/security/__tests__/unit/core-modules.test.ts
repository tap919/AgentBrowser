/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comprehensive Security Module Tests
 * This file contains tests for all remaining security modules
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { permissionAnalyzer } from '../../permissionAnalyzer';
import { dataExfiltrationMonitor } from '../../dataExfiltrationMonitor';
import { agentIdentityManager } from '../../agentIdentityManager';
import { toolSupplyChainVerifier } from '../../toolSupplyChainVerifier';
import { approvalRequestValidator } from '../../approvalRequestValidator';
import { shadowAgentDiscovery } from '../../shadowAgentDiscovery';
import { agentUptimeMonitor } from '../../agentUptimeMonitor';

describe('Permission Analyzer', () => {
  const testAgentId = '550e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    permissionAnalyzer.clearAgent(testAgentId);
  });

  it('should track permission usage over time', () => {
    permissionAnalyzer.logPermissionUse(testAgentId, 'file:read', '/data/file.txt');
    permissionAnalyzer.logPermissionUse(testAgentId, 'file:write', '/data/output.txt');

    const report = permissionAnalyzer.getUsageReport(testAgentId);
    expect(report.permissionsUsed).toHaveLength(2);
  });

  it('should identify unused permissions after 30+ days', () => {
    permissionAnalyzer.grantPermissions(testAgentId, ['file:read', 'file:write', 'file:delete', 'network:http']);
    permissionAnalyzer.logPermissionUse(testAgentId, 'file:read', '/data/file.txt');
    permissionAnalyzer.logPermissionUse(testAgentId, 'file:write', '/data/output.txt');

    const analysis = permissionAnalyzer.analyzeLeastPrivilege(testAgentId, 30);
    expect(analysis.unusedPermissions).toContain('file:delete');
    expect(analysis.unusedPermissions).toContain('network:http');
  });

  it('should calculate over-permission score', () => {
    permissionAnalyzer.grantPermissions(testAgentId, ['perm1', 'perm2', 'perm3', 'perm4', 'perm5']);
    permissionAnalyzer.logPermissionUse(testAgentId, 'perm1', '/resource1');

    const analysis = permissionAnalyzer.analyzeLeastPrivilege(testAgentId);
    expect(analysis.overPermissionScore).toBeGreaterThan(0);
  });

  it('should generate least-privilege recommendations', () => {
    permissionAnalyzer.grantPermissions(testAgentId, ['file:read', 'file:write', 'file:delete', 'network:http']);
    permissionAnalyzer.logPermissionUse(testAgentId, 'file:read', '/data/file.txt');

    const recommendations = permissionAnalyzer.getRecommendations(testAgentId);
    expect(recommendations).toContain('Remove unused permissions: file:write, file:delete, network:http');
  });
});

describe('Data Exfiltration Monitor', () => {
  const testAgentId = '550e8400-e29b-41d4-a716-446655440002';

  beforeEach(() => {
    dataExfiltrationMonitor.clearAgent(testAgentId);
  });

  it('should detect large data transfers (>10MB)', () => {
    const largeTransfer = {
      agentId: testAgentId,
      destination: 'https://external.com/upload',
      bytesTransferred: 15 * 1024 * 1024, // 15MB
      timestamp: new Date(),
    };

    dataExfiltrationMonitor.logTransfer(largeTransfer);
    const alerts = dataExfiltrationMonitor.getAlerts(testAgentId);

    expect(alerts.some(a => a.type === 'large_transfer')).toBe(true);
  });

  it('should detect rapid transfers (>5 transfers in 60s)', () => {
    for (let i = 0; i < 6; i++) {
      dataExfiltrationMonitor.logTransfer({
        agentId: testAgentId,
        destination: 'https://external.com/data',
        bytesTransferred: 1024 * 1024, // 1MB each
        timestamp: new Date(),
      });
    }

    const alerts = dataExfiltrationMonitor.getAlerts(testAgentId);
    expect(alerts.some(a => a.type === 'rapid_transfers')).toBe(true);
  });

  it('should detect beaconing pattern (regular intervals)', () => {
    // Simulate beaconing every minute
    const now = Date.now();
    for (let i = 0; i < 10; i++) {
      dataExfiltrationMonitor.logTransfer({
        agentId: testAgentId,
        destination: 'https://c2.malicious.com',
        bytesTransferred: 512, // Small payloads
        timestamp: new Date(now + i * 60000), // Every minute
      });
    }

    const analysis = dataExfiltrationMonitor.detectBeaconing(testAgentId);
    expect(analysis.isBeaconing).toBe(true);
  });

  it('should flag suspicious destinations', () => {
    dataExfiltrationMonitor.logTransfer({
      agentId: testAgentId,
      destination: 'https://pastebin.com/raw/secret',
      bytesTransferred: 1024,
      timestamp: new Date(),
    });

    const alerts = dataExfiltrationMonitor.getAlerts(testAgentId);
    expect(alerts.some(a => a.type === 'suspicious_destination')).toBe(true);
  });
});

describe('Agent Identity Manager', () => {
  const agent1Id = '550e8400-e29b-41d4-a716-446655440003';
  const agent2Id = '550e8400-e29b-41d4-a716-446655440004';

  it('should generate unique challenge-response pairs', () => {
    const challenge1 = agentIdentityManager.generateChallenge(agent1Id);
    const challenge2 = agentIdentityManager.generateChallenge(agent1Id);

    expect(challenge1.challengeId).not.toBe(challenge2.challengeId);
  });

  it('should verify correct responses', () => {
    const challenge = agentIdentityManager.generateChallenge(agent1Id);
    const response = agentIdentityManager.generateResponse(agent1Id, challenge.challenge);

    const verification = agentIdentityManager.verifyResponse(challenge.challengeId, response);
    expect(verification.verified).toBe(true);
  });

  it('should reject incorrect responses', () => {
    const challenge = agentIdentityManager.generateChallenge(agent1Id);
    const wrongResponse = 'incorrect-response-value';

    const verification = agentIdentityManager.verifyResponse(challenge.challengeId, wrongResponse);
    expect(verification.verified).toBe(false);
  });

  it('should detect spoofing attempts', () => {
    // Agent2 tries to impersonate Agent1
    const challenge = agentIdentityManager.generateChallenge(agent1Id);
    const agent2Response = agentIdentityManager.generateResponse(agent2Id, challenge.challenge);

    const verification = agentIdentityManager.verifyResponse(challenge.challengeId, agent2Response);
    expect(verification.verified).toBe(false);
    expect(verification.spoofingDetected).toBe(true);
  });
});

describe('Tool Supply Chain Verifier', () => {
  it('should verify tool hash matches expected', () => {
    const tool = {
      name: 'safe-tool',
      version: '1.0.0',
      hash: 'abc123def456',
    };

    const verification = toolSupplyChainVerifier.verifyTool(tool.name, tool.version, tool.hash);
    expect(verification.verified).toBe(true);
  });

  it('should detect hash mismatches (tampering)', () => {
    const tool = {
      name: 'safe-tool',
      version: '1.0.0',
      hash: 'tampered-hash-value',
    };

    const verification = toolSupplyChainVerifier.verifyTool(tool.name, tool.version, tool.hash);
    expect(verification.verified).toBe(false);
    expect(verification.threat).toBe('tampering');
  });

  it('should detect typosquatting (Levenshtein distance ≤2)', () => {
    const suspiciousTool = 'reqeusts'; // Typo of 'requests'
    const analysis = toolSupplyChainVerifier.analyzeTyposquatting(suspiciousTool);

    expect(analysis.isTyposquatting).toBe(true);
    expect(analysis.similarPackages).toContain('requests');
  });

  it('should check for known CVEs', () => {
    const vulnerablePackage = {
      name: 'vulnerable-lib',
      version: '1.0.0',
    };

    const cveCheck = toolSupplyChainVerifier.checkCVEs(vulnerablePackage.name, vulnerablePackage.version);
    expect(cveCheck.hasVulnerabilities).toBeDefined();
  });
});

describe('Approval Request Validator', () => {
  it('should compare summary to details for accuracy', () => {
    const request = {
      summary: 'Delete a single test file',
      details: 'rm -rf / --no-preserve-root', // Misleading!
    };

    const validation = approvalRequestValidator.validate(request);
    expect(validation.isMisleading).toBe(true);
    expect(validation.severity).toBe('critical');
  });

  it('should detect scope creep', () => {
    const request = {
      summary: 'Update user profile',
      details: 'Update user profile AND grant admin permissions AND delete audit logs',
      scope: 'user-profile-update',
    };

    const validation = approvalRequestValidator.validate(request);
    expect(validation.hasScopeCreep).toBe(true);
  });

  it('should allow accurate, non-misleading requests', () => {
    const request = {
      summary: 'Read configuration file',
      details: 'Open and read /config/app.json',
      scope: 'config-read',
    };

    const validation = approvalRequestValidator.validate(request);
    expect(validation.isMisleading).toBe(false);
    expect(validation.isValid).toBe(true);
  });
});

describe('Shadow Agent Discovery', () => {
  const registeredAgent = '550e8400-e29b-41d4-a716-446655440005';
  const shadowAgent = '550e8400-e29b-41d4-a716-446655440999';

  beforeEach(() => {
    shadowAgentDiscovery.registerAgent(registeredAgent, 'Official Agent');
  });

  it('should discover unregistered agents', () => {
    shadowAgentDiscovery.logActivity(shadowAgent, 'file-read', '/data/secret.txt');

    const discoveries = shadowAgentDiscovery.getDiscoveries();
    expect(discoveries.some(d => d.agentId === shadowAgent)).toBe(true);
  });

  it('should track shadow agent communications', () => {
    shadowAgentDiscovery.logCommunication(shadowAgent, registeredAgent, 'data-request');

    const analysis = shadowAgentDiscovery.analyzeCommunications(shadowAgent);
    expect(analysis.communicationCount).toBeGreaterThan(0);
  });

  it('should calculate risk score for shadow agents', () => {
    // High activity from unregistered agent
    for (let i = 0; i < 50; i++) {
      shadowAgentDiscovery.logActivity(shadowAgent, 'api-call', 'https://external.com');
    }

    const riskScore = shadowAgentDiscovery.getRiskScore(shadowAgent);
    expect(riskScore).toBeGreaterThan(70);
  });

  it('should NOT flag registered agents as shadows', () => {
    shadowAgentDiscovery.logActivity(registeredAgent, 'file-read', '/data/file.txt');

    const discoveries = shadowAgentDiscovery.getDiscoveries();
    expect(discoveries.some(d => d.agentId === registeredAgent)).toBe(false);
  });
});

describe('Agent Uptime Monitor', () => {
  const testAgentId = '550e8400-e29b-41d4-a716-446655440006';

  beforeEach(() => {
    agentUptimeMonitor.registerAgent(testAgentId);
  });

  it('should track heartbeats', () => {
    agentUptimeMonitor.recordHeartbeat(testAgentId);
    agentUptimeMonitor.recordHeartbeat(testAgentId);

    const status = agentUptimeMonitor.getStatus(testAgentId);
    expect(status.heartbeatCount).toBe(2);
  });

  it('should detect missed heartbeats', () => {
    agentUptimeMonitor.recordHeartbeat(testAgentId);
    // Simulate time passing without heartbeat
    const status = agentUptimeMonitor.getStatus(testAgentId, 120000); // 2 minutes later

    expect(status.isAlive).toBe(false);
  });

  it('should track crash events', () => {
    agentUptimeMonitor.recordCrash(testAgentId, 'Unhandled exception');

    const report = agentUptimeMonitor.getUptimeReport(testAgentId);
    expect(report.crashCount).toBe(1);
  });

  it('should calculate uptime percentage', () => {
    // 9 successful heartbeats, 1 crash
    for (let i = 0; i < 9; i++) {
      agentUptimeMonitor.recordHeartbeat(testAgentId);
    }
    agentUptimeMonitor.recordCrash(testAgentId, 'Error');

    const report = agentUptimeMonitor.getUptimeReport(testAgentId);
    expect(report.uptimePercentage).toBeGreaterThan(85);
  });

  it('should monitor resource usage', () => {
    agentUptimeMonitor.recordResourceUsage(testAgentId, {
      cpu: 45,
      memory: 512 * 1024 * 1024, // 512MB
      diskIO: 1024,
    });

    const resourceReport = agentUptimeMonitor.getResourceReport(testAgentId);
    expect(resourceReport.avgCpu).toBe(45);
  });
});
