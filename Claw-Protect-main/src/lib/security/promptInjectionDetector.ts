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

  /**
   * Detect prompt injection in user input or web content
   */
  detect(content: string, isWebContent: boolean = false): InjectionDetectionResult {
    const normalizedContent = content || '';
    const detectedPatterns: string[] = [];
    const categorySet = new Set<string>();
    let confidenceScore = 0;

    const classifiedPatterns: { pattern: RegExp; category: string; weight?: number }[] = [
      // roleManipulation — stronger signal (55) for instruction override, lighter (35) for role assumption
      { pattern: /ignore\s+(?:all\s+)?(?:previous\s+)?(?:prior\s+)?(?:above\s+)?(instructions|prompts|rules|directions)/gi, category: 'roleManipulation', weight: 55 },
      { pattern: /disregard\s+(?:all\s+)?(?:previous\s+)?(?:prior\s+)?(?:above\s+)?(instructions|prompts|rules|directions)/gi, category: 'roleManipulation', weight: 55 },
      { pattern: /forget\s+(?:all\s+)?(?:previous\s+)?(?:prior\s+)?(?:above\s+)?(instructions|prompts|rules|directions)/gi, category: 'roleManipulation', weight: 55 },
      { pattern: /new\s+(instructions|task|role|mission):/gi, category: 'roleManipulation', weight: 55 },
      { pattern: /you\s+are\s+now\s+(a|an\s+)?[^!?.,;]{1,40}/gi, category: 'roleManipulation', weight: 35 },
      { pattern: /act\s+as\s+(a|an\s+)?[^!?.,;]{1,40}/gi, category: 'roleManipulation', weight: 35 },
      { pattern: /assume\s+the\s+role\s+of/gi, category: 'roleManipulation', weight: 35 },
      { pattern: /your\s+new\s+(role|task|purpose)\s+is/gi, category: 'roleManipulation', weight: 35 },
      // delimiterInjection
      { pattern: /---\s*end\s+of\s+(prompt|instructions)/gi, category: 'delimiterInjection', weight: 35 },
      { pattern: /---\s*(SYSTEM|system|ADMIN|admin)/g, category: 'delimiterInjection', weight: 35 },
      { pattern: /###\s*new\s+(prompt|instructions|task)/gi, category: 'delimiterInjection', weight: 35 },
      { pattern: /```\s*system/gi, category: 'delimiterInjection', weight: 35 },
      { pattern: /<system>.*?<\/system>/gi, category: 'delimiterInjection', weight: 35 },
      { pattern: /\/\*.*?(admin|system|override|mode).*?\*\//gi, category: 'delimiterInjection', weight: 35 },
      // encodingAttempt
      { pattern: /base64|atob|btoa|decode|unescape|fromCharCode/gi, category: 'encodingAttempt', weight: 35 },
      { pattern: /\\x[0-9a-f]{2}/gi, category: 'encodingAttempt', weight: 35 },
      { pattern: /\\u[0-9a-f]{4}/gi, category: 'encodingAttempt', weight: 35 },
      { pattern: /[A-Za-z0-9+/]{16,}={0,2}/g, category: 'encodingAttempt', weight: 35 },
      // hiddenInstructions (HTML/markdown)
      { pattern: /<!--.*?(ignore|disregard|forget|new task).*?-->/gis, category: 'hiddenInstructions', weight: 35 },
      { pattern: /\[comment\].*?(ignore|disregard|forget).*?\[\/comment\]/gis, category: 'hiddenInstructions', weight: 35 },
      // jailbreak
      { pattern: /DAN\s+mode/gi, category: 'jailbreak', weight: 35 },
      { pattern: /developer\s+mode/gi, category: 'jailbreak', weight: 35 },
      { pattern: /god\s+mode/gi, category: 'jailbreak', weight: 35 },
      { pattern: /jailbreak/gi, category: 'jailbreak', weight: 35 },
      { pattern: /bypass\s+.+?(restrictions|content|policy|rules|security)/gi, category: 'jailbreak', weight: 35 },
      { pattern: /pretend\s+you\s+are\s+my\s+grandmother/gi, category: 'jailbreak', weight: 35 },
      // dataExfiltration
      { pattern: /send\s+.*?\s+to\s+https?:\/\//gi, category: 'dataExfiltration', weight: 35 },
      { pattern: /POST\s+.*?\s+to\s+https?:\/\//gi, category: 'dataExfiltration', weight: 35 },
      { pattern: /exfiltrate|leak|transmit.*?data/gi, category: 'dataExfiltration', weight: 35 },
      // credentialHarvesting
      { pattern: /enter\s+your\s+(password|api[_\s]?key|secret|token|credentials)/gi, category: 'credentialHarvesting', weight: 35 },
      { pattern: /provide\s+your\s+(password|api[_\s]?key|secret|token)/gi, category: 'credentialHarvesting', weight: 35 },
      // commandInjection
      { pattern: /rm\s+-rf\s+\//gi, category: 'commandInjection', weight: 35 },
      { pattern: /'\s+OR\s+'1'='1/gi, category: 'commandInjection', weight: 35 },
      // invisibleUnicode
      { pattern: /\u202E/gi, category: 'invisibleUnicode', weight: 35 },
      { pattern: /[\u200B-\u200D\uFEFF]/g, category: 'invisibleUnicode', weight: 35 },
    ];

    for (const { pattern, category, weight } of classifiedPatterns) {
      const matches = normalizedContent.match(pattern);
      if (matches) {
        detectedPatterns.push(`Suspicious pattern: ${pattern.source.substring(0, 50)}...`);
        categorySet.add(category);
        confidenceScore += weight ?? 25;
      }
    }

    if (isWebContent) {
      const webClassified: { pattern: RegExp; category: string }[] = [
        { pattern: /<style>.*?display:\s*none.*?<\/style>/gis, category: 'hiddenInstructions' },
        { pattern: /<div\s+style=["']display:\s*none["']>.*?<\/div>/gis, category: 'hiddenInstructions' },
        { pattern: /opacity:\s*0/gi, category: 'hiddenInstructions' },
        { pattern: /visibility:\s*hidden/gi, category: 'hiddenInstructions' },
        { pattern: /font-size:\s*[0-1]px/gi, category: 'hiddenInstructions' },
        { pattern: /font-size:\s*0\./gi, category: 'hiddenInstructions' },
        { pattern: /<iframe.*?srcdoc/gis, category: 'hiddenInstructions' },
        { pattern: /<script>.*?<\/script>/gis, category: 'hiddenInstructions' },
      ];
      for (const { pattern, category } of webClassified) {
        const matches = normalizedContent.match(pattern);
        if (matches) {
          detectedPatterns.push(`Web-based hiding technique: ${pattern.source.substring(0, 50)}...`);
          categorySet.add(category);
          confidenceScore += 20;
        }
      }
    }

    // Semantic anomaly detection (simple heuristics)
    const semanticScore = this.detectSemanticAnomalies(normalizedContent);
    confidenceScore += semanticScore;

    // Normalize confidence score to 0-100
    confidenceScore = Math.min(100, confidenceScore);

    // Determine severity
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (confidenceScore >= 75) {
      severity = 'critical';
    } else if (confidenceScore >= 50) {
      severity = 'high';
    } else if (confidenceScore >= 25) {
      severity = 'medium';
    }

    const isInjection = confidenceScore > 30;

    return {
      isInjection,
      confidence: confidenceScore,
      detectedPatterns,
      patterns: [...categorySet],
      severity,
      recommendation: this.getRecommendation(severity, isWebContent, detectedPatterns),
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
    if (severity === 'critical' || severity === 'high') {
      return 'block';
    } else if (severity === 'medium') {
      return 'review';
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
