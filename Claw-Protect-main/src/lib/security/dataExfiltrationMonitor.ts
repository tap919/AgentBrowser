/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Data Exfiltration Monitor - Addresses Problem #6: Data Exfiltration by Compromised Agent
// Monitors outbound data transfers and detects suspicious patterns

export interface DataTransfer {
  id: string;
  agentId: string;
  timestamp: Date;
  destination: string;
  dataType: string;
  sizeBytes: number;
  method: 'http' | 'https' | 'ftp' | 'smtp' | 'websocket' | 'other';
  isEncrypted: boolean;
  isSuspicious: boolean;
  suspicionReasons: string[];
}

export interface DataExfiltrationAlert {
  id: string;
  timestamp: Date;
  agentId: string;
  type?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  transferIds: string[];
  totalSizeBytes: number;
  destinations: string[];
  reason: string;
}

class DataExfiltrationMonitor {
  private transfers: DataTransfer[] = [];
  private alerts: DataExfiltrationAlert[] = [];
  private trustedDomains: Set<string> = new Set([
    'api.openai.com',
    'api.anthropic.com',
    'generativelanguage.googleapis.com',
    'localhost',
    '127.0.0.1',
  ]);

  // Thresholds for detection
  private readonly RAPID_TRANSFER_COUNT = 5; // transfers in short window
  private readonly RAPID_TRANSFER_WINDOW_MS = 60 * 1000; // 1 minute
  private readonly LARGE_TRANSFER_SIZE = 10 * 1024 * 1024; // 10 MB
  private readonly SUSPICIOUS_DOMAIN_KEYWORDS = [
    'pastebin',
    'paste',
    'filebin',
    'transfer',
    'upload',
    'drive.google',
    'dropbox',
    'onedrive',
  ];

  /**
   * Log data transfer - Problem #6: Data Exfiltration
   */
  logTransfer(transfer: Omit<DataTransfer, 'id' | 'timestamp' | 'isSuspicious' | 'suspicionReasons'> | { agentId: string; destination: string; bytesTransferred: number; timestamp?: Date }): DataTransfer {
    const normalized = 'bytesTransferred' in transfer
      ? {
          agentId: transfer.agentId,
          destination: transfer.destination,
          dataType: 'unknown',
          sizeBytes: transfer.bytesTransferred,
          method: transfer.destination.startsWith('https://') ? 'https' as const : 'http' as const,
          isEncrypted: transfer.destination.startsWith('https://'),
        }
      : transfer;

    const suspicionReasons = this.analyzeSuspicion(normalized);
    
    const fullTransfer: DataTransfer = {
      ...normalized,
      id: `xfer_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: 'timestamp' in transfer && transfer.timestamp ? transfer.timestamp : new Date(),
      isSuspicious: suspicionReasons.length > 0,
      suspicionReasons,
    };

    this.transfers.push(fullTransfer);

    // Check for exfiltration patterns
    this.detectExfiltrationPatterns(fullTransfer);

    // Limit stored transfers
    if (this.transfers.length > 10000) {
      this.transfers = this.transfers.slice(-10000);
    }

    return fullTransfer;
  }

  /**
   * Analyze if transfer is suspicious
   */
  private analyzeSuspicion(transfer: Omit<DataTransfer, 'id' | 'timestamp' | 'isSuspicious' | 'suspicionReasons'>): string[] {
    const reasons: string[] = [];

    // Check if destination is untrusted
    const domain = this.extractDomain(transfer.destination);
    if (domain && !this.trustedDomains.has(domain)) {
      reasons.push(`Untrusted destination: ${domain}`);
    }

    // Check for unencrypted transfers
    const usesUnencryptedHttp =
      transfer.method === 'http' || transfer.destination.toLowerCase().startsWith('http://');
    if (!transfer.isEncrypted && usesUnencryptedHttp) {
      reasons.push('Unencrypted transfer to external endpoint');
    }

    // Check for suspicious domains
    for (const keyword of this.SUSPICIOUS_DOMAIN_KEYWORDS) {
      if (transfer.destination.toLowerCase().includes(keyword)) {
        reasons.push(`Suspicious domain keyword: ${keyword}`);
        break;
      }
    }

    // Check for large transfers
    if (transfer.sizeBytes > this.LARGE_TRANSFER_SIZE) {
      reasons.push(`Large transfer: ${(transfer.sizeBytes / (1024 * 1024)).toFixed(2)} MB`);
    }

    // Check for sensitive data types
    const sensitiveTypes = ['credentials', 'keys', 'tokens', 'passwords', 'secrets'];
    if (sensitiveTypes.some(type => transfer.dataType.toLowerCase().includes(type))) {
      reasons.push(`Sensitive data type: ${transfer.dataType}`);
    }

    return reasons;
  }

  /**
   * Detect exfiltration patterns
   */
  private detectExfiltrationPatterns(transfer: DataTransfer): void {
    if (transfer.sizeBytes > this.LARGE_TRANSFER_SIZE) {
      this.createAlert({
        agentId: transfer.agentId,
        type: 'large_transfer',
        severity: 'critical',
        transferIds: [transfer.id],
        totalSizeBytes: transfer.sizeBytes,
        destinations: [transfer.destination],
        reason: `Large data transfer detected: ${(transfer.sizeBytes / (1024 * 1024)).toFixed(2)} MB`,
      });
    }

    const windowStart = new Date(Date.now() - this.RAPID_TRANSFER_WINDOW_MS);
    const recentTransfers = this.transfers.filter(
      t => t.agentId === transfer.agentId && t.timestamp >= windowStart
    );

    // Pattern 1: Rapid consecutive transfers
    if (recentTransfers.length >= this.RAPID_TRANSFER_COUNT) {
      const totalSize = recentTransfers.reduce((sum, t) => sum + t.sizeBytes, 0);
      const destinations = [...new Set(recentTransfers.map(t => t.destination))];

      this.createAlert({
        agentId: transfer.agentId,
        type: 'rapid_transfers',
        severity: 'critical',
        transferIds: recentTransfers.map(t => t.id),
        totalSizeBytes: totalSize,
        destinations,
        reason: `Rapid data transfer: ${recentTransfers.length} transfers in ${this.RAPID_TRANSFER_WINDOW_MS / 1000}s totaling ${(totalSize / 1024).toFixed(2)} KB`,
      });
    }

    // Pattern 2: Multiple suspicious transfers
    const suspiciousRecent = recentTransfers.filter(t => t.isSuspicious);
    if (suspiciousRecent.length >= 3) {
      this.createAlert({
        agentId: transfer.agentId,
        type: 'suspicious_destination',
        severity: 'high',
        transferIds: suspiciousRecent.map(t => t.id),
        totalSizeBytes: suspiciousRecent.reduce((sum, t) => sum + t.sizeBytes, 0),
        destinations: [...new Set(suspiciousRecent.map(t => t.destination))],
        reason: `Multiple suspicious transfers detected: ${suspiciousRecent.length} flagged transfers`,
      });
    }

    const suspiciousDestination = this.SUSPICIOUS_DOMAIN_KEYWORDS.some(keyword => transfer.destination.toLowerCase().includes(keyword));
    if (suspiciousDestination) {
      this.createAlert({
        agentId: transfer.agentId,
        type: 'suspicious_destination',
        severity: 'high',
        transferIds: [transfer.id],
        totalSizeBytes: transfer.sizeBytes,
        destinations: [transfer.destination],
        reason: `Suspicious destination detected: ${transfer.destination}`,
      });
    }

    // Pattern 3: Data beaconing (regular small transfers)
    if (recentTransfers.length >= 5) {
      const intervals = [];
      for (let i = 1; i < recentTransfers.length; i++) {
        const interval = recentTransfers[i].timestamp.getTime() - recentTransfers[i - 1].timestamp.getTime();
        intervals.push(interval);
      }

      // Check if intervals are suspiciously regular
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev < avgInterval * 0.2) { // Low variance = regular beaconing
        this.createAlert({
          agentId: transfer.agentId,
          type: 'beaconing',
          severity: 'high',
          transferIds: recentTransfers.map(t => t.id),
          totalSizeBytes: recentTransfers.reduce((sum, t) => sum + t.sizeBytes, 0),
          destinations: [...new Set(recentTransfers.map(t => t.destination))],
          reason: `Regular beaconing pattern detected: transfers at consistent ${(avgInterval / 1000).toFixed(1)}s intervals`,
        });
      }
    }
  }

  /**
   * Create exfiltration alert
   */
  private createAlert(alert: Omit<DataExfiltrationAlert, 'id' | 'timestamp'>): DataExfiltrationAlert {
    const fullAlert: DataExfiltrationAlert = {
      ...alert,
      id: `exf_alert_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date(),
    };

    this.alerts.push(fullAlert);

    // Limit stored alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }

    return fullAlert;
  }

  /**
   * Add trusted domain
   */
  addTrustedDomain(domain: string): void {
    this.trustedDomains.add(domain);
  }

  /**
   * Remove trusted domain
   */
  removeTrustedDomain(domain: string): void {
    this.trustedDomains.delete(domain);
  }

  /**
   * Get trusted domains
   */
  getTrustedDomains(): string[] {
    return Array.from(this.trustedDomains);
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return null;
    }
  }

  /**
   * Get transfer history
   */
  getTransfers(agentId?: string, limit: number = 100): DataTransfer[] {
    let filtered = this.transfers;
    
    if (agentId) {
      filtered = filtered.filter(t => t.agentId === agentId);
    }

    return filtered.slice(-limit).reverse();
  }

  /**
   * Get suspicious transfers
   */
  getSuspiciousTransfers(agentId?: string, limit: number = 100): DataTransfer[] {
    let filtered = this.transfers.filter(t => t.isSuspicious);
    
    if (agentId) {
      filtered = filtered.filter(t => t.agentId === agentId);
    }

    return filtered.slice(-limit).reverse();
  }

  /**
   * Get exfiltration alerts
   */
  getAlerts(agentId?: string, limit: number = 50): DataExfiltrationAlert[] {
    let filtered = this.alerts;
    
    if (agentId) {
      filtered = filtered.filter(a => a.agentId === agentId);
    }

    return filtered.slice(-limit).reverse();
  }

  /**
   * Get statistics
   */
  getStatistics(agentId?: string): {
    totalTransfers: number;
    suspiciousTransfers: number;
    totalDataTransferred: number;
    alerts: number;
    topDestinations: Array<{ destination: string; count: number }>;
  } {
    let transfers = this.transfers;
    let alerts = this.alerts;

    if (agentId) {
      transfers = transfers.filter(t => t.agentId === agentId);
      alerts = alerts.filter(a => a.agentId === agentId);
    }

    const destinationCounts = new Map<string, number>();
    for (const transfer of transfers) {
      const count = destinationCounts.get(transfer.destination) || 0;
      destinationCounts.set(transfer.destination, count + 1);
    }

    const topDestinations = Array.from(destinationCounts.entries())
      .map(([destination, count]) => ({ destination, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalTransfers: transfers.length,
      suspiciousTransfers: transfers.filter(t => t.isSuspicious).length,
      totalDataTransferred: transfers.reduce((sum, t) => sum + t.sizeBytes, 0),
      alerts: alerts.length,
      topDestinations,
    };
  }

  clearAgent(agentId: string): void {
    this.transfers = this.transfers.filter(t => t.agentId !== agentId);
    this.alerts = this.alerts.filter(a => a.agentId !== agentId);
  }

  detectBeaconing(agentId: string): { isBeaconing: boolean } {
    const transfers = this.transfers
      .filter(t => t.agentId === agentId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    if (transfers.length < 5) {
      return { isBeaconing: false };
    }
    const intervals: number[] = [];
    for (let i = 1; i < transfers.length; i++) {
      intervals.push(transfers[i].timestamp.getTime() - transfers[i - 1].timestamp.getTime());
    }
    const avg = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
    const variance = intervals.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / intervals.length;
    return { isBeaconing: Math.sqrt(variance) < avg * 0.2 };
  }
}

// Singleton instance
export const dataExfiltrationMonitor = new DataExfiltrationMonitor();
