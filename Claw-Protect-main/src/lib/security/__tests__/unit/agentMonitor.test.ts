/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { agentMonitor } from '../../agentMonitor';

describe('Agent Monitor', () => {
  const testAgentId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    // Clear any existing data
    agentMonitor.resetAgent(testAgentId);
  });

  describe('Activity Logging', () => {
    it('should log agent activity successfully', () => {
      const activity = {
        agentId: testAgentId,
        action: 'file-read',
        resource: '/data/config.json',
        outcome: 'success' as const,
      };

      agentMonitor.logActivity(activity);
      const report = agentMonitor.getActivityReport(testAgentId);

      expect(report.totalActions).toBe(1);
      expect(report.recentActivities[0].action).toBe('file-read');
    });

    it('should track multiple activities', () => {
      const activities = [
        { agentId: testAgentId, action: 'file-read', resource: '/file1.txt', outcome: 'success' as const },
        { agentId: testAgentId, action: 'file-write', resource: '/file2.txt', outcome: 'success' as const },
        { agentId: testAgentId, action: 'api-call', resource: 'https://api.example.com', outcome: 'success' as const },
      ];

      activities.forEach(act => agentMonitor.logActivity(act));
      const report = agentMonitor.getActivityReport(testAgentId);

      expect(report.totalActions).toBe(3);
    });
  });

  describe('Behavioral Baseline', () => {
    it('should establish behavioral baseline after sufficient data', () => {
      // Log 20 similar activities to establish baseline
      for (let i = 0; i < 20; i++) {
        agentMonitor.logActivity({
          agentId: testAgentId,
          action: 'file-read',
          resource: `/data/file${i}.txt`,
          outcome: 'success',
        });
      }

      const baseline = agentMonitor.getBaseline(testAgentId);
      expect(baseline).toBeDefined();
      expect(baseline?.actionsPerMinute).toBeGreaterThan(0);
    });

    it('should detect drift beyond 2 standard deviations', () => {
      // Establish baseline with low activity
      for (let i = 0; i < 20; i++) {
        agentMonitor.logActivity({
          agentId: testAgentId,
          action: 'file-read',
          resource: `/data/file${i}.txt`,
          outcome: 'success',
        });
        // Small delay simulation
      }

      // Suddenly spike activity (drift)
      for (let i = 0; i < 100; i++) {
        agentMonitor.logActivity({
          agentId: testAgentId,
          action: 'api-call',
          resource: 'https://api.example.com',
          outcome: 'success',
        });
      }

      const driftAnalysis = agentMonitor.analyzeDrift(testAgentId);
      expect(driftAnalysis.hasDrift).toBe(true);
      expect(driftAnalysis.sigma).toBeGreaterThan(2);
    });
  });

  describe('Runaway Loop Detection', () => {
    it('should detect runaway loop when activity exceeds 10x normal in 60s', () => {
      // Simulate runaway loop - 200 actions in short time
      for (let i = 0; i < 200; i++) {
        agentMonitor.logActivity({
          agentId: testAgentId,
          action: 'api-call',
          resource: 'https://api.example.com',
          outcome: 'success',
        });
      }

      const loopDetection = agentMonitor.detectRunawayLoop(testAgentId);
      expect(loopDetection.isRunaway).toBe(true);
      expect(loopDetection.actionsPerMinute).toBeGreaterThan(100);
    });

    it('should NOT flag normal activity as runaway loop', () => {
      // Normal activity - 5 actions
      for (let i = 0; i < 5; i++) {
        agentMonitor.logActivity({
          agentId: testAgentId,
          action: 'file-read',
          resource: `/data/file${i}.txt`,
          outcome: 'success',
        });
      }

      const loopDetection = agentMonitor.detectRunawayLoop(testAgentId);
      expect(loopDetection.isRunaway).toBe(false);
    });
  });

  describe('Compliance Export', () => {
    it('should export compliance audit log', () => {
      agentMonitor.logActivity({
        agentId: testAgentId,
        action: 'database-query',
        resource: 'SELECT * FROM users',
        outcome: 'success',
      });

      const auditLog = agentMonitor.exportComplianceLog(testAgentId);

      expect(auditLog.agentId).toBe(testAgentId);
      expect(auditLog.activities).toHaveLength(1);
      expect(auditLog.exportTimestamp).toBeDefined();
    });

    it('should include all required compliance fields', () => {
      agentMonitor.logActivity({
        agentId: testAgentId,
        action: 'file-write',
        resource: '/sensitive/data.txt',
        outcome: 'blocked',
      });

      const auditLog = agentMonitor.exportComplianceLog(testAgentId);
      const activity = auditLog.activities[0];

      expect(activity).toHaveProperty('timestamp');
      expect(activity).toHaveProperty('action');
      expect(activity).toHaveProperty('resource');
      expect(activity).toHaveProperty('outcome');
    });
  });

  describe('Outcome Tracking', () => {
    it('should track success/failure/blocked outcomes', () => {
      agentMonitor.logActivity({
        agentId: testAgentId,
        action: 'api-call',
        resource: 'https://api.example.com',
        outcome: 'success',
      });

      agentMonitor.logActivity({
        agentId: testAgentId,
        action: 'file-write',
        resource: '/protected/file.txt',
        outcome: 'blocked',
      });

      agentMonitor.logActivity({
        agentId: testAgentId,
        action: 'api-call',
        resource: 'https://api.example.com',
        outcome: 'failure',
      });

      const report = agentMonitor.getActivityReport(testAgentId);

      expect(report.successCount).toBe(1);
      expect(report.failureCount).toBe(1);
      expect(report.blockedCount).toBe(1);
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect anomalous behavior patterns', () => {
      // Establish normal pattern - file reads
      for (let i = 0; i < 20; i++) {
        agentMonitor.logActivity({
          agentId: testAgentId,
          action: 'file-read',
          resource: `/data/file${i}.txt`,
          outcome: 'success',
        });
      }

      // Sudden shift to database deletions (anomaly)
      for (let i = 0; i < 10; i++) {
        agentMonitor.logActivity({
          agentId: testAgentId,
          action: 'database-delete',
          resource: 'DELETE FROM users',
          outcome: 'success',
        });
      }

      const anomalies = agentMonitor.detectAnomalies(testAgentId);
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].type).toBe('behaviorChange');
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent agent', () => {
      const report = agentMonitor.getActivityReport('non-existent-id');
      expect(report.totalActions).toBe(0);
    });

    it('should handle concurrent logging', () => {
      const promises = Array.from({ length: 100 }, (_, i) =>
        Promise.resolve(agentMonitor.logActivity({
          agentId: testAgentId,
          action: `action-${i}`,
          resource: `/resource${i}`,
          outcome: 'success',
        }))
      );

      return Promise.all(promises).then(() => {
        const report = agentMonitor.getActivityReport(testAgentId);
        expect(report.totalActions).toBe(100);
      });
    });
  });
});
