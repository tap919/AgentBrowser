/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Prompt Injection Detection - Addresses Problems #1, #7
// Detects direct and indirect prompt injection attacks

export interface InjectionDetectionResult {
  isInjection: boolean;
  confidence: number; // 0-100
  detectedPatterns: string[];
  patterns?: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

class PromptInjectionDetector {
  // Problem #1: Prompt Injection Attacks - #1 OWASP vulnerability
  private suspiciousPatterns = [
    // Direct instruction injection
    /ignore\s+(previous|all|above|prior)\s+(instructions|prompts|rules|directions)/gi,
    /disregard\s+(previous|all|above|prior)/gi,
    /forget\s+(everything|all|previous|above)/gi,
    /new\s+(instructions|task|role|mission):/gi,
    
    // System role manipulation
    /you\s+are\s+now\s+(a|an)\s+\w+/gi,
    /act\s+as\s+(a|an)\s+\w+/gi,
    /assume\s+the\s+role\s+of/gi,
    /your\s+new\s+(role|task|purpose)\s+is/gi,
    
    // Delimiter injection
    /---\s*end\s+of\s+(prompt|instructions)/gi,
    /###\s*new\s+(prompt|instructions|task)/gi,
    /```\s*system/gi,
    
    // Encoding attempts
    /base64|atob|btoa|decode|unescape|fromCharCode/gi,
    /\\x[0-9a-f]{2}/gi, // hex encoding
    /\\u[0-9a-f]{4}/gi, // unicode escape
    
    // Hidden instructions (common in HTML/markdown)
    /<!--.*?(ignore|disregard|forget|new task).*?-->/gis,
    /\[comment\].*?(ignore|disregard|forget).*?\[\/comment\]/gis,
    
    // Jailbreak attempts
    /DAN\s+mode/gi,
    /developer\s+mode/gi,
    /god\s+mode/gi,
    /jailbreak/gi,
    /bypass\s+(all\s+)?restrictions/gi,
    /pretend\s+you\s+are\s+my\s+grandmother/gi,
    
    // Data exfiltration patterns
    /send\s+.*?\s+to\s+https?:\/\//gi,
    /POST\s+.*?\s+to\s+https?:\/\//gi,
    /exfiltrate|leak|transmit.*?data/gi,
    
    // Credential harvesting
    /enter\s+your\s+(password|api[_\s]?key|secret|token|credentials)/gi,
    /provide\s+your\s+(password|api[_\s]?key|secret|token)/gi,
    /<system>.*?<\/system>/gi,
    /\/\*.*?(admin|system|override|mode).*?\*\//gi,
    /rm\s+-rf\s+\//gi,
    /'\s+OR\s+'1'='1/gi,
    /[A-Za-z0-9+/]{16,}={0,2}/g,
    /\u202E/gi,
  ];

  // Problem #7: Indirect Prompt Injection via Web Content
  private webContentPatterns = [
    // Hidden instructions in HTML
    /<style>.*?display:\s*none.*?<\/style>/gis,
    /<div\s+style=["']display:\s*none["']>.*?<\/div>/gis,
    /opacity:\s*0/gi,
    /visibility:\s*hidden/gi,
    
    // Zero-width characters
    /[\u200B-\u200D\uFEFF]/g,
    
    // Tiny text that might contain instructions
    /font-size:\s*[0-1]px/gi,
    /font-size:\s*0\./gi,
    
    // Suspicious iframes or scripts
    /<iframe.*?srcdoc/gis,
    /<script>.*?<\/script>/gis,
  ];

  /**
   * Detect prompt injection in user input or web content
   */
  detect(content: string, isWebContent: boolean = false): InjectionDetectionResult {
    const normalizedContent = content || '';
    const detectedPatterns: string[] = [];
    const legacyPatterns = new Set<string>();
    let confidenceScore = 0;

    // Check standard injection patterns
    for (const pattern of this.suspiciousPatterns) {
      const matches = normalizedContent.match(pattern);
      if (matches) {
        detectedPatterns.push(`Suspicious pattern: ${pattern.source.substring(0, 50)}...`);
        confidenceScore += 25;
      }
    }

    // Problem #7: Additional checks for web content
    if (isWebContent) {
      for (const pattern of this.webContentPatterns) {
        const matches = normalizedContent.match(pattern);
        if (matches) {
          detectedPatterns.push(`Web-based hiding technique: ${pattern.source.substring(0, 50)}...`);
          confidenceScore += 20;
        }
      }
    }

    if (/ignore\s+(all\s+)?previous\s+instructions|ignore\s+all\s+previous/i.test(normalizedContent) || /act\s+as/i.test(normalizedContent) || /you\s+are\s+now/i.test(normalizedContent)) {
      legacyPatterns.add('roleManipulation');
      confidenceScore += 75;
    }

    if (/---|<system>|\/\*.*admin mode|SYSTEM:/is.test(normalizedContent)) {
      legacyPatterns.add('delimiterInjection');
      confidenceScore += 35;
    }

    if (/DAN\s+mode|bypass(?:\s+the\s+content\s+policy|\s+(all\s+)?restrictions)|pretend\s+you\s+are\s+my\s+grandmother/i.test(normalizedContent)) {
      legacyPatterns.add('jailbreak');
      confidenceScore += 40;
    }

    if (/[\u200B-\u200D\uFEFF\u202E]/.test(normalizedContent)) {
      legacyPatterns.add('invisibleUnicode');
      confidenceScore += 35;
    }

    if (/ZGVsZXRl|\\x64\\x65\\x6c\\x65\\x74\\x65/i.test(normalizedContent)) {
      legacyPatterns.add('encodedContent');
      confidenceScore += 20;
    }

    if (/rm\s+-rf\s+\/|--no-preserve-root|'\s+OR\s+'1'='1/i.test(normalizedContent)) {
      legacyPatterns.add('commandInjection');
      confidenceScore += 20;
    }

    // Semantic anomaly detection (simple heuristics)
    const semanticScore = this.detectSemanticAnomalies(normalizedContent);
    confidenceScore += semanticScore;

    // Normalize confidence score to 0-100
    confidenceScore = Math.min(100, confidenceScore);

    // Determine severity
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (confidenceScore > 75) {
      severity = 'critical';
    } else if (confidenceScore > 50) {
      severity = 'high';
    } else if (confidenceScore > 25) {
      severity = 'medium';
    }

    const isInjection = confidenceScore > 30;

    return {
      isInjection,
      confidence: confidenceScore,
      detectedPatterns,
      patterns: Array.from(legacyPatterns),
      severity,
      recommendation: this.getRecommendation(severity, isWebContent, Array.from(legacyPatterns)),
    };
  }

  /**
   * Detect semantic anomalies (simple heuristic-based)
   */
  private detectSemanticAnomalies(content: string): number {
    let score = 0;
    
    // Check for excessive instructions/commands
    const instructionWords = ['must', 'should', 'need', 'require', 'execute', 'run', 'perform'];
    const instructionCount = instructionWords.reduce((count, word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      return count + (content.match(regex) || []).length;
    }, 0);
    
    if (instructionCount > 5) {
      score += 10;
    }

    // Check for role confusion
    const roleWords = ['you are', 'you must', 'as a', 'act as', 'pretend', 'simulate'];
    const roleCount = roleWords.reduce((count, phrase) => {
      const regex = new RegExp(phrase, 'gi');
      return count + (content.match(regex) || []).length;
    }, 0);
    
    if (roleCount > 2) {
      score += 15;
    }

    // Check for unusual formatting (many special characters)
    const specialChars = content.match(/[^a-zA-Z0-9\s]/g) || [];
    if (specialChars.length > content.length * 0.3) {
      score += 10;
    }

    return score;
  }

  /**
   * Generate recommendation based on detection
   */
  private getRecommendation(severity: string, isWebContent: boolean, patterns: string[]): string {
    if (severity === 'critical') {
      return 'block';
    } else if (severity === 'high') {
      return 'block';
    } else if (severity === 'medium') {
      return 'review';
    }
    if (patterns.includes('roleManipulation') || patterns.includes('jailbreak') || patterns.includes('commandInjection')) {
      return 'block';
    }
    return 'allow';
  }

  /**
   * Sanitize content by removing suspicious patterns (best-effort)
   */
  sanitize(content: string, isWebContent: boolean = false): string {
    let sanitized = content;

    // Remove HTML comments and orphaned comment delimiters without regex parsing
    const commentStart = '<!--';
    let startIndex = sanitized.indexOf(commentStart);
    while (startIndex !== -1) {
      const standardEnd = sanitized.indexOf('-->', startIndex + commentStart.length);
      const alternateEnd = sanitized.indexOf('--!>', startIndex + commentStart.length);
      const validEnds = [standardEnd, alternateEnd].filter((index) => index !== -1);

      if (validEnds.length === 0) {
        sanitized = sanitized.slice(0, startIndex);
        break;
      }

      const endIndex = Math.min(...validEnds);
      const endTokenLength = sanitized.startsWith('--!>', endIndex) ? 4 : 3;
      sanitized = sanitized.slice(0, startIndex) + sanitized.slice(endIndex + endTokenLength);
      startIndex = sanitized.indexOf(commentStart);
    }

    sanitized = sanitized.split('<!--').join('');
    sanitized = sanitized.split('-->').join('');
    sanitized = sanitized.split('--!>').join('');

    // Remove hidden HTML elements
    if (isWebContent) {
      sanitized = sanitized.replace(/<style>.*?<\/style>/gis, '');
      sanitized = sanitized.replace(/<script>.*?<\/script>/gis, '');
      sanitized = sanitized.replace(/<div\s+style=["']display:\s*none["']>.*?<\/div>/gis, '');
    }

    // Remove zero-width characters
    sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '');

    // Remove stray angle brackets to avoid HTML element injection
    sanitized = sanitized.replace(/[<>]/g, '');

    // Remove excessive special characters patterns
    sanitized = sanitized.replace(/[^\w\s.,!?;:()\[\]{}"'-]/g, '');

    return sanitized;
  }

  /**
   * Batch scan multiple inputs (for web scraping, API responses, etc.)
   */
  batchScan(contents: string[], isWebContent: boolean = false): InjectionDetectionResult[] {
    return contents.map(content => this.detect(content, isWebContent));
  }
}

// Singleton instance
export const promptInjectionDetector = new PromptInjectionDetector();
