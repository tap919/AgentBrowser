import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkServiceHealth, checkAllServices, SERVICES, preBuildAudit, requireService } from '@/lib/service-hub';

describe('service-hub', () => {
  beforeEach(() => {
    // Reset service statuses
    for (const svc of SERVICES) {
      svc.status = 'unknown';
      svc.apiKey = undefined;
    }
  });

  describe('requireService', () => {
    it('returns a registered service', () => {
      const svc = requireService('vibeserve');
      expect(svc.id).toBe('vibeserve');
      expect(svc.port).toBe(8000);
    });

    it('throws for unknown service', () => {
      expect(() => requireService('nonexistent')).toThrow('not found');
    });
  });

  describe('checkServiceHealth', () => {
    it('reports stopped when service is not running', async () => {
      const result = await checkServiceHealth(SERVICES[0]);
      expect(result.running).toBe(false);
      expect(result.id).toBeTruthy();
    });

    it('reports stopped for unreachable port', async () => {
      const result = await checkServiceHealth(SERVICES[1]);
      expect(result.running).toBe(false);
    });

    it('does not throw for any service', async () => {
      for (const svc of SERVICES) {
        await expect(checkServiceHealth(svc)).resolves.not.toThrow();
      }
    });
  });

  describe('checkAllServices', () => {
    it('returns status for all services', async () => {
      const results = await checkAllServices();
      expect(results).toHaveLength(SERVICES.length);
      expect(results.every(r => 'running' in r)).toBe(true);
      expect(results.every(r => 'id' in r)).toBe(true);
    });

    it('all results have string ids', async () => {
      const results = await checkAllServices();
      for (const r of results) {
        expect(typeof r.id).toBe('string');
        expect(r.id.length).toBeGreaterThan(0);
      }
    });
  });

  describe('preBuildAudit', () => {
    it('falls back to local analysis when services are down', async () => {
      const result = await preBuildAudit('TestProject', '/tmp/test');
      expect(result.rank).toBeDefined();
      expect(typeof result.rank.score).toBe('number');
      expect(typeof result.rank.quality).toBe('string');
      expect(Array.isArray(result.rank.issues)).toBe(true);
    });

    it('returns a valid result object', async () => {
      const result = await preBuildAudit('My App', '/tmp/myapp');
      expect(result).toHaveProperty('rank');
      expect(result).toHaveProperty('plan');
      expect(result.rank.score).toBeGreaterThanOrEqual(0);
      expect(result.rank.score).toBeLessThanOrEqual(100);
    });
  });

  describe('SERVICES registry', () => {
    it('has exactly 3 services', () => {
      expect(SERVICES).toHaveLength(3);
    });

    it('each service has required fields', () => {
      for (const svc of SERVICES) {
        expect(svc.id).toBeTruthy();
        expect(svc.name).toBeTruthy();
        expect(svc.port).toBeGreaterThan(0);
        expect(svc.healthEndpoint).toMatch(/^\//);
        expect(Array.isArray(svc.capabilities)).toBe(true);
        expect(svc.capabilities.length).toBeGreaterThan(0);
      }
    });

    it('mutly is configured on port 4000 (no conflict with AgentBrowser)', () => {
      const mutly = SERVICES.find(s => s.id === 'mutly');
      expect(mutly?.port).toBe(4000);
    });

    it('vibeserve is on port 8000', () => {
      const vs = SERVICES.find(s => s.id === 'vibeserve');
      expect(vs?.port).toBe(8000);
    });

    it('reporank is on port 3001', () => {
      const rr = SERVICES.find(s => s.id === 'reporank');
      expect(rr?.port).toBe(3001);
    });

    it('no two services share the same port', () => {
      const ports = SERVICES.map(s => s.port);
      expect(new Set(ports).size).toBe(ports.length);
    });

    it('all services have unique ids', () => {
      const ids = SERVICES.map(s => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
