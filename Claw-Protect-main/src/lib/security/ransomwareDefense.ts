/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Advanced Ransomware Defense - Addresses 2026 Trend: Ransomware 3.0
// Detects ransomware behavior, triple extortion patterns, and operational timing attacks

export interface FileActivity {
  id: string;
  agentId: string;
  path: string;
  operation: 'read' | 'write' | 'rename' | 'delete' | 'modify' | 'encrypt';
  timestamp: Date;
  sizeBytes?: number;
  fileExtension?: string;
  isEncrypted?: boolean;
}

export interface RansomwareIndicator {
  id: string;
  agentId: string;
  detectedAt: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  indicatorType: 'rapid-encryption' | 'mass-file-changes' | 'suspicious-extensions' | 'data-exfiltration' | 'backup-deletion' | 'ransom-note' | 'triple-extortion' | 'timing-attack' | 'ransomware-kev';
  description: string;
  affectedFiles: string[];
  confidence: number; // 0-100
  recommendedAction: string;
}

export interface BackupIntegrity {
  backupId: string;
  path: string;
  createdAt: Date;
  lastVerified: Date;
  hash: string;
  isIntact: boolean;
  isEncrypted: boolean;
  isImmutable: boolean;
  tamperAttempts: number;
}

export interface TripleExtortionPattern {
  id: string;
  agentId: string;
  detectedAt: Date;
  stages: {
    encryption: boolean; // Stage 1: Encrypt data
    exfiltration: boolean; // Stage 2: Steal data
    partnerThreats: boolean; // Stage 3: Threaten partners/customers
  };
  severity: 'medium' | 'high' | 'critical';
  description: string;
  evidenceFiles: string[];
  exfiltratedDataSize?: number;
  targetedPartners?: string[];
}

export interface OperationalTimingAttack {
  id: string;
  detectedAt: Date;
  attackTime: Date;
  isBusinessHours: boolean;
  isPeakPeriod: boolean;
  dayOfWeek: string;
  timeZone: string;
  likelihood: number; // 0-100 that this is a deliberate timing attack
  description: string;
}

// ─── KEV interface (structural — avoids circular import) ──────────────────────

interface KevEntry {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  knownRansomwareCampaignUse: string;
  requiredAction: string;
  shortDescription?: string;
}

interface KevLookup {
  getRansomwareLinkedKevs(): KevEntry[];
  lookupCve(cveId: string): KevEntry | undefined;
}

class RansomwareDefense {
  private fileActivities: FileActivity[] = [];
  private ransomwareIndicators: RansomwareIndicator[] = [];
  private backupRegistry: Map<string, BackupIntegrity> = new Map();
  private tripleExtortionPatterns: TripleExtortionPattern[] = [];
  private timingAttacks: OperationalTimingAttack[] = [];
  private kevService: KevLookup | undefined;
  private kevRansomwareAlerts: RansomwareIndicator[] = [];

  /** Inject the KEV service at startup (avoids circular import). */
  setKevService(svc: KevLookup): void {
    this.kevService = svc;
  }

  // Known ransomware file extensions
  private readonly RANSOMWARE_EXTENSIONS = [
    '.encrypted', '.locked', '.crypto', '.crypt', '.enc',
    '.locky', '.cerber', '.cryptolocker', '.wannacry',
    '.ryuk', '.maze', '.revil', '.conti', '.lockbit',
    '.blackcat', '.alphv', '.royal', '.play', '.cactus',
  ];

  // Thresholds for detection
  private readonly RAPID_ENCRYPTION_THRESHOLD = 50; // files in short window
  private readonly RAPID_ENCRYPTION_WINDOW_MS = 60 * 1000; // 1 minute
  private readonly MASS_CHANGE_THRESHOLD = 100; // file modifications
  private readonly EXFILTRATION_SIZE_THRESHOLD = 100 * 1024 * 1024; // 100 MB

  // Business hours for timing attack detection (can be configured per organization)
  private businessHours = {
    start: 9, // 9 AM
    end: 17, // 5 PM
    peakStart: 10, // 10 AM
    peakEnd: 15, // 3 PM
    businessDays: [1, 2, 3, 4, 5], // Monday-Friday
  };

  /**
   * Log file activity for monitoring
   */
  logFileActivity(activity: Omit<FileActivity, 'id' | 'timestamp'>): FileActivity {
    // Extract file extension from path if not provided
    let fileExtension = activity.fileExtension;
    if (!fileExtension && activity.path) {
      const lastDot = activity.path.lastIndexOf('.');
      if (lastDot > 0 && lastDot < activity.path.length - 1) {
        fileExtension = activity.path.substring(lastDot);
      }
    }
    
    const fullActivity: FileActivity = {
      ...activity,
      fileExtension,
      id: `file_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`,
      timestamp: new Date(),
    };

    this.fileActivities.push(fullActivity);

    // Detect ransomware patterns
    this.detectRansomwareBehavior(fullActivity);

    // Limit stored activities
    if (this.fileActivities.length > 10000) {
      this.fileActivities = this.fileActivities.slice(-10000);
    }

    return fullActivity;
  }

  /**
   * Detect ransomware behavior patterns
   */
  private detectRansomwareBehavior(activity: FileActivity): void {
    const indicators: RansomwareIndicator[] = [];

    // Check for suspicious file extensions
    if (activity.fileExtension && this.RANSOMWARE_EXTENSIONS.includes(activity.fileExtension.toLowerCase())) {
      indicators.push({
        id: `ransomware_${Date.now()}`,
        agentId: activity.agentId,
        detectedAt: new Date(),
        severity: 'critical',
        indicatorType: 'suspicious-extensions',
        description: `Suspicious ransomware extension detected: ${activity.fileExtension}`,
        affectedFiles: [activity.path],
        confidence: 95,
        recommendedAction: 'CRITICAL: Potential ransomware detected. Isolate system immediately and investigate.',
      });
    }

    // Check for rapid encryption pattern
    const recentEncryptions = this.fileActivities.filter(
      fa => fa.agentId === activity.agentId &&
           fa.operation === 'encrypt' &&
           Date.now() - fa.timestamp.getTime() < this.RAPID_ENCRYPTION_WINDOW_MS
    );

    if (recentEncryptions.length >= this.RAPID_ENCRYPTION_THRESHOLD) {
      indicators.push({
        id: `ransomware_${Date.now()}`,
        agentId: activity.agentId,
        detectedAt: new Date(),
        severity: 'critical',
        indicatorType: 'rapid-encryption',
        description: `Rapid encryption detected: ${recentEncryptions.length} files encrypted in 1 minute`,
        affectedFiles: recentEncryptions.map(fa => fa.path),
        confidence: 90,
        recommendedAction: 'CRITICAL: Ransomware attack likely in progress. Disconnect network and stop agent immediately.',
      });
    }

    // Check for mass file changes
    const recentChanges = this.fileActivities.filter(
      fa => fa.agentId === activity.agentId &&
           (fa.operation === 'write' || fa.operation === 'modify' || fa.operation === 'rename') &&
           Date.now() - fa.timestamp.getTime() < 5 * 60 * 1000 // 5 minutes
    );

    if (recentChanges.length >= this.MASS_CHANGE_THRESHOLD) {
      indicators.push({
        id: `ransomware_${Date.now()}`,
        agentId: activity.agentId,
        detectedAt: new Date(),
        severity: 'high',
        indicatorType: 'mass-file-changes',
        description: `Mass file modification detected: ${recentChanges.length} files changed in 5 minutes`,
        affectedFiles: recentChanges.map(fa => fa.path),
        confidence: 75,
        recommendedAction: 'HIGH: Investigate for potential ransomware or malicious activity.',
      });
    }

    // Check for backup deletion (common ransomware tactic)
    if (activity.operation === 'delete' && 
        (activity.path.includes('backup') || activity.path.includes('.bak') || activity.path.includes('snapshot'))) {
      indicators.push({
        id: `ransomware_${Date.now()}`,
        agentId: activity.agentId,
        detectedAt: new Date(),
        severity: 'critical',
        indicatorType: 'backup-deletion',
        description: `Backup file deletion detected: ${activity.path}`,
        affectedFiles: [activity.path],
        confidence: 85,
        recommendedAction: 'CRITICAL: Backup deletion is a common ransomware precursor. Investigate immediately.',
      });
    }

    // Check for ransom note creation
    if (activity.operation === 'write' && 
        (activity.path.toLowerCase().includes('readme') || 
         activity.path.toLowerCase().includes('ransom') ||
         activity.path.toLowerCase().includes('decrypt'))) {
      indicators.push({
        id: `ransomware_${Date.now()}`,
        agentId: activity.agentId,
        detectedAt: new Date(),
        severity: 'critical',
        indicatorType: 'ransom-note',
        description: `Potential ransom note created: ${activity.path}`,
        affectedFiles: [activity.path],
        confidence: 90,
        recommendedAction: 'CRITICAL: Ransom note detected. System is likely compromised by ransomware.',
      });
    }
    
    // Check for data exfiltration (large file reads that may precede encryption)
    if (activity.sizeBytes && activity.sizeBytes > this.EXFILTRATION_SIZE_THRESHOLD) {
      indicators.push({
        id: `ransomware_${Date.now()}`,
        agentId: activity.agentId,
        detectedAt: new Date(),
        severity: 'high',
        indicatorType: 'data-exfiltration',
        description: `Large data operation detected: ${(activity.sizeBytes / 1024 / 1024).toFixed(2)} MB`,
        affectedFiles: [activity.path],
        confidence: 70,
        recommendedAction: 'HIGH: Large data transfer may indicate exfiltration attempt. Monitor closely.',
      });
    }

    // Store indicators
    indicators.forEach(indicator => this.ransomwareIndicators.push(indicator));

    // Check for triple extortion pattern
    this.detectTripleExtortion(activity.agentId);

    // Check for operational timing attack
    this.detectOperationalTimingAttack();

    // Limit stored indicators
    if (this.ransomwareIndicators.length > 1000) {
      this.ransomwareIndicators = this.ransomwareIndicators.slice(-1000);
    }
  }

  /**
   * Detect triple extortion pattern (encrypt + exfiltrate + threaten partners)
   */
  private detectTripleExtortion(agentId: string): void {
    const recentIndicators = this.ransomwareIndicators.filter(
      ri => ri.agentId === agentId &&
           Date.now() - ri.detectedAt.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    const hasEncryption = recentIndicators.some(
      ri => ri.indicatorType === 'rapid-encryption' || ri.indicatorType === 'suspicious-extensions'
    );

    const hasExfiltration = recentIndicators.some(
      ri => ri.indicatorType === 'data-exfiltration'
    );

    // Partner threats would be detected through communication monitoring (simplified here)
    const hasPartnerThreats = false; // Would be detected through email/communication analysis

    if (hasEncryption && hasExfiltration) {
      const pattern: TripleExtortionPattern = {
        id: `triple_ext_${Date.now()}`,
        agentId,
        detectedAt: new Date(),
        stages: {
          encryption: hasEncryption,
          exfiltration: hasExfiltration,
          partnerThreats: hasPartnerThreats,
        },
        severity: hasPartnerThreats ? 'critical' : 'high',
        description: hasPartnerThreats 
          ? 'Triple extortion attack detected: encryption, data theft, and partner threats'
          : 'Double extortion attack detected: encryption and data theft',
        evidenceFiles: recentIndicators.flatMap(ri => ri.affectedFiles),
      };

      this.tripleExtortionPatterns.push(pattern);

      // Add indicator
      this.ransomwareIndicators.push({
        id: `ransomware_${Date.now()}`,
        agentId,
        detectedAt: new Date(),
        severity: pattern.severity,
        indicatorType: 'triple-extortion',
        description: pattern.description,
        affectedFiles: pattern.evidenceFiles,
        confidence: 85,
        recommendedAction: 'CRITICAL: Advanced ransomware attack. Activate incident response plan immediately.',
      });
    }
  }

  /**
   * Detect operational timing attacks (attacks during peak business periods)
   */
  private detectOperationalTimingAttack(): void {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const recentCriticalIndicators = this.ransomwareIndicators.filter(
      ri => ri.severity === 'critical' &&
           Date.now() - ri.detectedAt.getTime() < 5 * 60 * 1000 // Last 5 minutes
    );

    if (recentCriticalIndicators.length === 0) return;
    
    // Check if we already detected a timing attack in the last 10 minutes
    const recentTimingAttack = this.timingAttacks.find(
      t => Date.now() - t.detectedAt.getTime() < 10 * 60 * 1000
    );
    if (recentTimingAttack) return; // De-duplicate - one timing attack per 10-minute window

    const isBusinessDay = this.businessHours.businessDays.includes(dayOfWeek);
    const isBusinessHours = hour >= this.businessHours.start && hour < this.businessHours.end;
    const isPeakPeriod = hour >= this.businessHours.peakStart && hour < this.businessHours.peakEnd;

    // Calculate likelihood of deliberate timing
    let likelihood = 0;
    if (isBusinessDay) likelihood += 30;
    if (isBusinessHours) likelihood += 30;
    if (isPeakPeriod) likelihood += 40;

    if (likelihood >= 60) {
      const attack: OperationalTimingAttack = {
        id: `timing_attack_${Date.now()}`,
        detectedAt: new Date(),
        attackTime: now,
        isBusinessHours,
        isPeakPeriod,
        dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        likelihood,
        description: isPeakPeriod 
          ? `Ransomware attack detected during peak business hours (${hour}:00). This is likely a deliberate operational timing attack to maximize impact.`
          : `Ransomware attack detected during business hours. May be a timing attack to maximize disruption.`,
      };

      this.timingAttacks.push(attack);

      // Add indicator
      this.ransomwareIndicators.push({
        id: `ransomware_${Date.now()}`,
        agentId: recentCriticalIndicators[0].agentId,
        detectedAt: new Date(),
        severity: 'critical',
        indicatorType: 'timing-attack',
        description: attack.description,
        affectedFiles: [],
        confidence: likelihood,
        recommendedAction: 'CRITICAL: Operational timing attack detected. This is a sophisticated ransomware campaign. Activate emergency response.',
      });
    }
  }

  /**
   * Register backup for integrity monitoring
   */
  registerBackup(backup: Omit<BackupIntegrity, 'lastVerified' | 'tamperAttempts'>): BackupIntegrity {
    const fullBackup: BackupIntegrity = {
      ...backup,
      lastVerified: new Date(),
      tamperAttempts: 0,
    };

    this.backupRegistry.set(backup.backupId, fullBackup);
    return fullBackup;
  }

  /**
   * Verify backup integrity
   */
  verifyBackupIntegrity(backupId: string, currentHash: string): { isIntact: boolean; tampered: boolean } {
    const backup = this.backupRegistry.get(backupId);
    
    if (!backup) {
      return { isIntact: false, tampered: false };
    }

    const isIntact = backup.hash === currentHash;
    
    if (!isIntact) {
      backup.tamperAttempts++;
      backup.isIntact = false;
      
      // Log as ransomware indicator
      this.ransomwareIndicators.push({
        id: `ransomware_${Date.now()}`,
        agentId: 'system',
        detectedAt: new Date(),
        severity: 'critical',
        indicatorType: 'backup-deletion',
        description: `Backup integrity check failed for ${backup.path}. Possible tampering or ransomware.`,
        affectedFiles: [backup.path],
        confidence: 95,
        recommendedAction: 'CRITICAL: Backup tampering detected. Investigate for ransomware immediately.',
      });
    }

    backup.lastVerified = new Date();
    this.backupRegistry.set(backupId, backup);

    return { isIntact, tampered: !isIntact };
  }

  /**
   * Get ransomware indicators
   */
  getRansomwareIndicators(filter?: {
    agentId?: string;
    severity?: string;
    indicatorType?: string;
    since?: Date;
  }): RansomwareIndicator[] {
    let indicators = this.ransomwareIndicators;

    if (filter?.agentId) {
      indicators = indicators.filter(i => i.agentId === filter.agentId);
    }

    if (filter?.severity) {
      indicators = indicators.filter(i => i.severity === filter.severity);
    }

    if (filter?.indicatorType) {
      indicators = indicators.filter(i => i.indicatorType === filter.indicatorType);
    }

    if (filter?.since) {
      indicators = indicators.filter(i => i.detectedAt >= filter.since!);
    }

    return indicators;
  }

  /**
   * Get triple extortion patterns
   */
  getTripleExtortionPatterns(agentId?: string): TripleExtortionPattern[] {
    if (agentId) {
      return this.tripleExtortionPatterns.filter(p => p.agentId === agentId);
    }
    return this.tripleExtortionPatterns;
  }

  /**
   * Get operational timing attacks
   */
  getOperationalTimingAttacks(): OperationalTimingAttack[] {
    return this.timingAttacks;
  }

  /**
   * Get backup integrity status
   */
  getBackupStatus(): BackupIntegrity[] {
    return Array.from(this.backupRegistry.values());
  }

  /**
   * Get statistics for monitoring
   */
  getStatistics() {
    const last24h = Date.now() - 24 * 60 * 60 * 1000;
    const recentIndicators = this.ransomwareIndicators.filter(
      i => i.detectedAt.getTime() > last24h
    );

    const criticalIndicators = recentIndicators.filter(i => i.severity === 'critical');
    const backups = Array.from(this.backupRegistry.values());
    const compromisedBackups = backups.filter(b => !b.isIntact);

    return {
      totalIndicatorsLast24h: recentIndicators.length,
      criticalIndicators: criticalIndicators.length,
      rapidEncryptionEvents: recentIndicators.filter(i => i.indicatorType === 'rapid-encryption').length,
      tripleExtortionAttempts: this.tripleExtortionPatterns.filter(
        p => p.detectedAt.getTime() > last24h
      ).length,
      timingAttacks: this.timingAttacks.filter(
        t => t.detectedAt.getTime() > last24h
      ).length,
      totalBackups: backups.length,
      compromisedBackups: compromisedBackups.length,
      backupIntegrityRate: backups.length > 0 
        ? Math.round((backups.filter(b => b.isIntact).length / backups.length) * 100)
        : 100,
    };
  }

  /**
   * Configure business hours for timing attack detection
   */
  configureBusinessHours(config: {
    start?: number;
    end?: number;
    peakStart?: number;
    peakEnd?: number;
    businessDays?: number[];
  }): void {
    this.businessHours = {
      ...this.businessHours,
      ...config,
    };
  }

  /**
   * Check CISA KEV catalog for ransomware-linked vulnerabilities matching
   * a specific vendor/product. Results are stored and returned as indicators.
   */
  checkKevRansomwareThreats(agentId: string, vendor: string, product: string): RansomwareIndicator[] {
    if (!this.kevService) return [];

    const allRansomwareKevs = this.kevService.getRansomwareLinkedKevs();
    const lowerVendor = vendor.toLowerCase();
    const lowerProduct = product.toLowerCase();

    const matched = allRansomwareKevs.filter(
      (entry) =>
        entry.vendorProject.toLowerCase().includes(lowerVendor) ||
        entry.product.toLowerCase().includes(lowerProduct),
    );

    const newIndicators: RansomwareIndicator[] = matched.map((entry) => ({
      id: `kev_ransomware_${Date.now()}_${entry.cveID}`,
      agentId,
      detectedAt: new Date(),
      severity: 'critical' as const,
      indicatorType: 'ransomware-kev' as const,
      description: `CISA KEV ransomware-linked vulnerability: ${entry.cveID} — ${entry.vulnerabilityName} (${entry.vendorProject} / ${entry.product}). ${entry.requiredAction}`,
      affectedFiles: [],
      confidence: 100,
      recommendedAction: `CRITICAL: Apply patch immediately. CISA KEV required action: ${entry.requiredAction}`,
    }));

    this.kevRansomwareAlerts.push(...newIndicators);
    this.ransomwareIndicators.push(...newIndicators);

    return newIndicators;
  }

  /**
   * Get all KEV-sourced ransomware alerts.
   */
  getKevRansomwareAlerts(): RansomwareIndicator[] {
    return this.kevRansomwareAlerts;
  }

  /**
   * Emergency response: Get immediate action recommendations
   */
  getEmergencyResponse(): {
    threatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
    immediateActions: string[];
    affectedSystems: string[];
    estimatedImpact: string;
  } {
    const recentCritical = this.ransomwareIndicators.filter(
      i => i.severity === 'critical' &&
           Date.now() - i.detectedAt.getTime() < 10 * 60 * 1000 // Last 10 minutes
    );

    if (recentCritical.length === 0) {
      return {
        threatLevel: 'none',
        immediateActions: [],
        affectedSystems: [],
        estimatedImpact: 'No active threats detected',
      };
    }

    const threatLevel: 'critical' | 'high' = recentCritical.length > 3 ? 'critical' : 'high';
    const affectedAgents = [...new Set(recentCritical.map(i => i.agentId))];
    const hasTripleExtortion = recentCritical.some(i => i.indicatorType === 'triple-extortion');
    const hasTimingAttack = recentCritical.some(i => i.indicatorType === 'timing-attack');

    const immediateActions = [
      '1. ISOLATE: Disconnect affected systems from network immediately',
      '2. STOP: Terminate all AI agents and automated processes',
      '3. PRESERVE: Do not shut down systems - preserve evidence for forensics',
      '4. NOTIFY: Alert security team and incident response',
      '5. VERIFY: Check backup integrity and secure offline backups',
    ];

    if (hasTripleExtortion) {
      immediateActions.push('6. ALERT: Notify customers/partners of potential data breach');
      immediateActions.push('7. LEGAL: Contact legal team for ransom negotiation guidance');
    }

    if (hasTimingAttack) {
      immediateActions.push('8. BUSINESS: Activate business continuity plan for operational impact');
    }

    return {
      threatLevel,
      immediateActions,
      affectedSystems: affectedAgents,
      estimatedImpact: hasTripleExtortion 
        ? 'SEVERE: Triple extortion ransomware with data theft and partner threats'
        : 'HIGH: Ransomware attack with potential data loss',
    };
  }
}

// Export singleton instance
export const ransomwareDefense = new RansomwareDefense();
