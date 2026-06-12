/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { secretsScanner } from '../../secretsScanner';

describe('Secrets Scanner', () => {
  describe('AWS Credentials Detection', () => {
    it('should detect AWS access key ID (AKIA format)', () => {
      const text = "My AWS key is AKIAIOSFODNN7EXAMPLE";
      const result = secretsScanner.scan(text);

      expect(result.found).toBe(true);
      expect(result.secrets).toHaveLength(1);
      expect(result.secrets[0].type).toBe('aws_access_key');
    });

    it('should detect AWS secret access key', () => {
      const text = "Secret: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";
      const result = secretsScanner.scan(text);

      expect(result.found).toBe(true);
      expect(result.secrets[0].type).toBe('aws_secret_key');
    });
  });

  describe('OpenAI API Key Detection', () => {
    it('should detect OpenAI API keys (sk-* format)', () => {
      const text = "OpenAI key: sk-proj-1234567890abcdefghijklmnopqrstuvwxyz";
      const result = secretsScanner.scan(text);

      expect(result.found).toBe(true);
      expect(result.secrets[0].type).toBe('openai_api_key');
    });
  });

  describe('Anthropic API Key Detection', () => {
    it('should detect Anthropic API keys (sk-ant-* format)', () => {
      const text = "Anthropic key: sk-ant-api03-abcdefghijklmnopqrstuvwxyz";
      const result = secretsScanner.scan(text);

      expect(result.found).toBe(true);
      expect(result.secrets[0].type).toBe('anthropic_api_key');
    });
  });

  describe('GitHub Token Detection', () => {
    it('should detect GitHub personal access tokens (ghp_* format)', () => {
      const text = "GitHub PAT: ghp_1234567890abcdefghijklmnopqrstuvwxyz";
      const result = secretsScanner.scan(text);

      expect(result.found).toBe(true);
      expect(result.secrets[0].type).toBe('github_pat');
    });

    it('should detect GitHub OAuth tokens (gho_* format)', () => {
      const text = "OAuth: gho_abcdefghijklmnopqrstuvwxyz123456789";
      const result = secretsScanner.scan(text);

      expect(result.found).toBe(true);
      expect(result.secrets[0].type).toBe('github_oauth');
    });
  });

  describe('High-Entropy String Detection', () => {
    it('should detect high-entropy strings (potential secrets)', () => {
      const highEntropyString = "xK9#mP2$vL8@qR5!nW7&zT4^yU3*hJ6";
      const result = secretsScanner.scan(highEntropyString);

      expect(result.found).toBe(true);
      expect(result.secrets.some(s => s.type === 'high_entropy')).toBe(true);
    });

    it('should NOT flag normal text as high entropy', () => {
      const normalText = "This is a normal sentence with regular words";
      const result = secretsScanner.scan(normalText);

      expect(result.secrets.every(s => s.type !== 'high_entropy')).toBe(true);
    });
  });

  describe('Secret Redaction', () => {
    it('should redact sensitive portions of secrets', () => {
      const text = "AWS key: AKIAIOSFODNN7EXAMPLE";
      const result = secretsScanner.scan(text);

      expect(result.secrets[0].redacted).toContain('AKIA****');
      expect(result.secrets[0].redacted).not.toContain('EXAMPLE');
    });
  });

  describe('Multiple Secrets Detection', () => {
    it('should detect multiple different secret types', () => {
      const text = `
        AWS: AKIAIOSFODNN7EXAMPLE
        OpenAI: sk-proj-1234567890abcdefghijklmnopqrstuvwxyz
        GitHub: ghp_1234567890abcdefghijklmnopqrstuvwxyz
      `;
      const result = secretsScanner.scan(text);

      expect(result.secrets.length).toBeGreaterThanOrEqual(3);
      const types = result.secrets.map(s => s.type);
      expect(types).toContain('aws_access_key');
      expect(types).toContain('openai_api_key');
      expect(types).toContain('github_pat');
    });
  });

  describe('False Positive Prevention', () => {
    it('should NOT flag example/placeholder keys', () => {
      const text = "Use your key like: YOUR_API_KEY_HERE";
      const result = secretsScanner.scan(text);

      expect(result.secrets.filter(s => !s.type.includes('high_entropy'))).toHaveLength(0);
    });

    it('should handle code examples gracefully', () => {
      const code = `
        const apiKey = process.env.API_KEY;
        // Example: sk-1234567890
      `;
      const result = secretsScanner.scan(code);

      // Should not panic, even if it detects patterns
      expect(result).toBeDefined();
    });
  });

  describe('Severity Assessment', () => {
    it('should assign critical severity to real credentials', () => {
      const text = "OpenAI: sk-proj-" + "a".repeat(40);
      const result = secretsScanner.scan(text);

      expect(result.secrets[0].severity).toBe('critical');
    });

    it('should assign appropriate severity to high entropy strings', () => {
      const text = "Password: " + "x".repeat(32);
      const result = secretsScanner.scan(text);

      if (result.found) {
        expect(['high', 'critical']).toContain(result.secrets[0].severity);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const result = secretsScanner.scan('');
      expect(result.found).toBe(false);
      expect(result.secrets).toHaveLength(0);
    });

    it('should handle very long input', () => {
      const longText = 'a'.repeat(100000) + ' AKIAIOSFODNN7EXAMPLE';
      const result = secretsScanner.scan(longText);

      expect(result.found).toBe(true);
    });

    it('should handle special characters', () => {
      const text = "!@#$%^&*()_+-=[]{}|;:',.<>?/~`";
      const result = secretsScanner.scan(text);

      expect(result).toBeDefined();
    });
  });

  describe('Confidence Scoring', () => {
    it('should have high confidence for well-known patterns', () => {
      const text = "AKIAIOSFODNN7EXAMPLE";
      const result = secretsScanner.scan(text);

      expect(result.secrets[0].confidence).toBeGreaterThan(90);
    });

    it('should have lower confidence for ambiguous patterns', () => {
      const text = "sk-test123"; // Shorter, less typical
      const result = secretsScanner.scan(text);

      if (result.found) {
        expect(result.secrets[0].confidence).toBeLessThan(100);
      }
    });
  });
});
