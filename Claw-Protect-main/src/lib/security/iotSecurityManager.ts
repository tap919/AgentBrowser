/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// IoT Security Manager - Addresses 2026 Trend: IoT & Expanding Attack Surface
// IoT device discovery, firmware verification, anomalous behavior detection, edge compute security

export interface IoTDevice {
  deviceId: string;
  deviceType: 'sensor' | 'actuator' | 'gateway' | 'edge-compute' | 'smart-device' | 'industrial' | 'medical' | 'unknown';
  name: string;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  ipAddress: string;
  macAddress: string;
  protocol: 'mqtt' | 'coap' | 'http' | 'https' | 'zigbee' | 'bluetooth' | 'lorawan' | 'modbus' | 'other';
  isEncrypted: boolean;
  lastSeen: Date;
  firstSeen: Date;
  isAuthorized: boolean;
  securityPosture: 'secure' | 'degraded' | 'vulnerable' | 'compromised' | 'unknown';
}

export interface FirmwareInfo {
  deviceId: string;
  version: string;
  hash: string;
  isVerified: boolean;
  hasKnownVulnerabilities: boolean;
  vulnerabilities: string[];
  lastChecked: Date;
  updateAvailable?: string;
}

export interface IoTBehavior {
  deviceId: string;
  timestamp: Date;
  activityType: 'data-transmission' | 'command-received' | 'config-change' | 'firmware-update' | 'network-scan' | 'power-cycle';
  details: string;
  dataVolumeBytes?: number;
  destination?: string;
  isAnomalous: boolean;
  anomalyReasons: string[];
}

export interface IoTThreat {
  id: string;
  deviceId: string;
  detectedAt: Date;
  threatType: 'unauthorized-device' | 'firmware-tampering' | 'data-exfiltration' | 'botnet-activity' | 'lateral-movement' | 'dos-attack' | 'man-in-middle';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedDevices: string[];
  recommendedAction: string;
  confidence: number; // 0-100
}

export interface EdgeComputeNode {
  nodeId: string;
  location: string;
  connectedDevices: string[];
  cpuUsage: number; // 0-100
  memoryUsage: number; // 0-100
  isSecure: boolean;
  securityIssues: string[];
  lastHealthCheck: Date;
}

export interface DeviceBaseline {
  deviceId: string;
  typicalDataVolume: number; // bytes per hour
  typicalTransmissionInterval: number; // seconds
  typicalDestinations: string[];
  typicalProtocols: string[];
  normalOperatingHours: number[]; // hours of day (0-23)
  createdAt: Date;
  lastUpdated: Date;
  sampleSize: number;
}

class IoTSecurityManager {
  private devices: Map<string, IoTDevice> = new Map();
  private firmwareRegistry: Map<string, FirmwareInfo> = new Map();
  private deviceBehaviors: IoTBehavior[] = [];
  private deviceBaselines: Map<string, DeviceBaseline> = new Map();
  private iotThreats: IoTThreat[] = [];
  private edgeNodes: Map<string, EdgeComputeNode> = new Map();

  // Known vulnerable firmware versions (simplified - would use CVE database)
  private readonly VULNERABLE_FIRMWARE = [
    { pattern: /^1\.0\./, description: 'Legacy firmware with known vulnerabilities' },
    { pattern: /beta/i, description: 'Beta firmware not suitable for production' },
    { pattern: /debug/i, description: 'Debug build with potential security issues' },
  ];

  // Thresholds for anomaly detection
  private readonly DATA_VOLUME_MULTIPLIER = 5; // Alert if 5x normal
  private readonly SCAN_THRESHOLD = 10; // Port scans or network discovery attempts
  private readonly BOTNET_INDICATORS = ['mirai', 'ddos', 'flood', 'attack'];

  /**
   * Discover and register IoT device
   */
  discoverDevice(device: Omit<IoTDevice, 'firstSeen' | 'lastSeen' | 'securityPosture'>): IoTDevice {
    const existingDevice = this.devices.get(device.deviceId);
    
    const fullDevice: IoTDevice = {
      ...device,
      firstSeen: existingDevice?.firstSeen || new Date(),
      lastSeen: new Date(),
      securityPosture: this.assessSecurityPosture(device),
    };

    this.devices.set(device.deviceId, fullDevice);

    // Check if device is authorized
    if (!fullDevice.isAuthorized) {
      this.iotThreats.push({
        id: `threat_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`,
        deviceId: device.deviceId,
        detectedAt: new Date(),
        threatType: 'unauthorized-device',
        severity: 'high',
        description: `Unauthorized IoT device detected: ${device.name} (${device.deviceType})`,
        affectedDevices: [device.deviceId],
        recommendedAction: 'Investigate device, verify legitimacy, isolate if malicious',
        confidence: 90,
      });
    }

    // Initialize baseline
    if (!existingDevice) {
      this.initializeBaseline(device.deviceId);
    }

    return fullDevice;
  }

  /**
   * Assess device security posture
   */
  private assessSecurityPosture(device: Partial<IoTDevice>): IoTDevice['securityPosture'] {
    let issues = 0;

    // Check encryption
    if (!device.isEncrypted) issues++;

    // Check protocol security
    if (device.protocol === 'http' || device.protocol === 'mqtt') {
      issues++; // Unencrypted protocols
    }

    // Check authorization
    if (device.isAuthorized === false) issues += 2;

    // Determine posture
    if (issues === 0) return 'secure';
    if (issues === 1) return 'degraded';
    if (issues >= 2) return 'vulnerable';
    
    return 'unknown';
  }

  /**
   * Verify device firmware
   */
  verifyFirmware(deviceId: string, version: string, hash: string): FirmwareInfo {
    const device = this.devices.get(deviceId);
    
    // Check for known vulnerabilities
    const hasKnownVulnerabilities = this.VULNERABLE_FIRMWARE.some(
      vuln => vuln.pattern.test(version)
    );

    const vulnerabilities: string[] = [];
    if (hasKnownVulnerabilities) {
      this.VULNERABLE_FIRMWARE.forEach(vuln => {
        if (vuln.pattern.test(version)) {
          vulnerabilities.push(vuln.description);
        }
      });
    }

    const firmwareInfo: FirmwareInfo = {
      deviceId,
      version,
      hash,
      isVerified: true, // In production, would verify against manufacturer's signature
      hasKnownVulnerabilities,
      vulnerabilities,
      lastChecked: new Date(),
    };

    this.firmwareRegistry.set(deviceId, firmwareInfo);

    // Generate threat if vulnerable
    if (hasKnownVulnerabilities) {
      this.iotThreats.push({
        id: `threat_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`,
        deviceId,
        detectedAt: new Date(),
        threatType: 'firmware-tampering',
        severity: 'high',
        description: `Device running vulnerable firmware: ${version}`,
        affectedDevices: [deviceId],
        recommendedAction: 'Update firmware immediately',
        confidence: 95,
      });

      // Update device security posture
      if (device) {
        device.securityPosture = 'vulnerable';
        this.devices.set(deviceId, device);
      }
    }

    return firmwareInfo;
  }

  /**
   * Log device behavior for monitoring
   */
  logBehavior(behavior: Omit<IoTBehavior, 'timestamp' | 'isAnomalous' | 'anomalyReasons'>): IoTBehavior {
    const baseline = this.deviceBaselines.get(behavior.deviceId);
    const anomalyReasons: string[] = [];

    // Detect anomalies
    if (baseline) {
      // Check data volume
      if (behavior.dataVolumeBytes && behavior.dataVolumeBytes > baseline.typicalDataVolume * this.DATA_VOLUME_MULTIPLIER) {
        anomalyReasons.push(`Data volume ${behavior.dataVolumeBytes} bytes exceeds typical ${baseline.typicalDataVolume} bytes`);
      }

      // Check destination
      if (behavior.destination && !baseline.typicalDestinations.includes(behavior.destination)) {
        anomalyReasons.push(`New destination: ${behavior.destination}`);
      }

      // Check operating hours
      const currentHour = new Date().getHours();
      if (!baseline.normalOperatingHours.includes(currentHour)) {
        anomalyReasons.push(`Activity outside normal hours (${currentHour}:00)`);
      }
    }

    // Check for suspicious activity types
    if (behavior.activityType === 'network-scan') {
      anomalyReasons.push('Network scanning activity detected');
    }

    const fullBehavior: IoTBehavior = {
      ...behavior,
      timestamp: new Date(),
      isAnomalous: anomalyReasons.length > 0,
      anomalyReasons,
    };

    this.deviceBehaviors.push(fullBehavior);

    // Detect threats based on behavior
    this.detectBehavioralThreats(fullBehavior);

    // Update baseline
    if (baseline && !fullBehavior.isAnomalous) {
      this.updateBaseline(behavior.deviceId, fullBehavior);
    }

    // Limit stored behaviors
    if (this.deviceBehaviors.length > 10000) {
      this.deviceBehaviors = this.deviceBehaviors.slice(-10000);
    }

    return fullBehavior;
  }

  /**
   * Initialize behavior baseline for device
   */
  private initializeBaseline(deviceId: string): void {
    const baseline: DeviceBaseline = {
      deviceId,
      typicalDataVolume: 1024, // 1 KB default
      typicalTransmissionInterval: 60, // 1 minute default
      typicalDestinations: [],
      typicalProtocols: [],
      normalOperatingHours: [9, 10, 11, 12, 13, 14, 15, 16, 17], // Business hours default
      createdAt: new Date(),
      lastUpdated: new Date(),
      sampleSize: 0,
    };

    this.deviceBaselines.set(deviceId, baseline);
  }

  /**
   * Update behavior baseline
   */
  private updateBaseline(deviceId: string, behavior: IoTBehavior): void {
    const baseline = this.deviceBaselines.get(deviceId);
    if (!baseline) return;

    // Update data volume (moving average)
    if (behavior.dataVolumeBytes) {
      baseline.typicalDataVolume = Math.round(
        (baseline.typicalDataVolume * baseline.sampleSize + behavior.dataVolumeBytes) / (baseline.sampleSize + 1)
      );
    }

    // Update destinations
    if (behavior.destination && !baseline.typicalDestinations.includes(behavior.destination)) {
      baseline.typicalDestinations.push(behavior.destination);
    }

    // Update operating hours
    const currentHour = new Date().getHours();
    if (!baseline.normalOperatingHours.includes(currentHour)) {
      baseline.normalOperatingHours.push(currentHour);
    }

    baseline.sampleSize++;
    baseline.lastUpdated = new Date();

    this.deviceBaselines.set(deviceId, baseline);
  }

  /**
   * Detect behavioral threats
   */
  private detectBehavioralThreats(behavior: IoTBehavior): void {
    if (!behavior.isAnomalous) return;

    const threats: IoTThreat[] = [];

    // Check for data exfiltration
    if (behavior.dataVolumeBytes && behavior.dataVolumeBytes > 10 * 1024 * 1024) {
      threats.push({
        id: `threat_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`,
        deviceId: behavior.deviceId,
        detectedAt: new Date(),
        threatType: 'data-exfiltration',
        severity: 'critical',
        description: `Large data transmission detected: ${(behavior.dataVolumeBytes / 1024 / 1024).toFixed(2)} MB`,
        affectedDevices: [behavior.deviceId],
        recommendedAction: 'Investigate data transmission, isolate device if compromised',
        confidence: 80,
      });
    }

    // Check for network scanning (botnet indicator)
    if (behavior.activityType === 'network-scan') {
      threats.push({
        id: `threat_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`,
        deviceId: behavior.deviceId,
        detectedAt: new Date(),
        threatType: 'botnet-activity',
        severity: 'high',
        description: 'Device performing network scanning - possible botnet activity',
        affectedDevices: [behavior.deviceId],
        recommendedAction: 'URGENT: Isolate device, check for malware, reset to factory settings',
        confidence: 85,
      });
    }

    // Check for suspicious destination
    if (behavior.destination && this.isSuspiciousDestination(behavior.destination)) {
      threats.push({
        id: `threat_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`,
        deviceId: behavior.deviceId,
        detectedAt: new Date(),
        threatType: 'data-exfiltration',
        severity: 'high',
        description: `Device communicating with suspicious destination: ${behavior.destination}`,
        affectedDevices: [behavior.deviceId],
        recommendedAction: 'Block destination, investigate device',
        confidence: 75,
      });
    }

    threats.forEach(threat => this.iotThreats.push(threat));

    // Limit stored threats
    if (this.iotThreats.length > 1000) {
      this.iotThreats = this.iotThreats.slice(-1000);
    }
  }

  /**
   * Check if destination is suspicious
   */
  private isSuspiciousDestination(destination: string): boolean {
    // Check for known malicious patterns
    const suspiciousPatterns = [
      /pastebin/i,
      /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+/, // Raw IP with port
      /\.onion$/i, // Tor hidden service
      /\.bit$/i, // Namecoin domain
    ];

    return suspiciousPatterns.some(pattern => pattern.test(destination));
  }

  /**
   * Register edge compute node
   */
  registerEdgeNode(node: EdgeComputeNode): EdgeComputeNode {
    this.edgeNodes.set(node.nodeId, node);
    return node;
  }

  /**
   * Update edge node health
   */
  updateEdgeNodeHealth(nodeId: string, cpuUsage: number, memoryUsage: number): boolean {
    const node = this.edgeNodes.get(nodeId);
    if (!node) return false;

    node.cpuUsage = cpuUsage;
    node.memoryUsage = memoryUsage;
    node.lastHealthCheck = new Date();

    // Check for resource exhaustion
    const securityIssues: string[] = [];
    if (cpuUsage > 90) {
      securityIssues.push('High CPU usage - possible DoS attack');
    }
    if (memoryUsage > 90) {
      securityIssues.push('High memory usage - possible memory exhaustion attack');
    }

    node.securityIssues = securityIssues;
    node.isSecure = securityIssues.length === 0;

    this.edgeNodes.set(nodeId, node);
    return true;
  }

  /**
   * Get devices by security posture
   */
  getDevicesByPosture(posture: IoTDevice['securityPosture']): IoTDevice[] {
    return Array.from(this.devices.values()).filter(
      device => device.securityPosture === posture
    );
  }

  /**
   * Get IoT threats
   */
  getIoTThreats(filter?: {
    deviceId?: string;
    severity?: string;
    threatType?: string;
  }): IoTThreat[] {
    let threats = this.iotThreats;

    if (filter?.deviceId) {
      threats = threats.filter(t => t.deviceId === filter.deviceId);
    }

    if (filter?.severity) {
      threats = threats.filter(t => t.severity === filter.severity);
    }

    if (filter?.threatType) {
      threats = threats.filter(t => t.threatType === filter.threatType);
    }

    return threats;
  }

  /**
   * Get statistics for monitoring
   */
  getStatistics() {
    const devices = Array.from(this.devices.values());
    const recentThreats = this.iotThreats.filter(
      t => Date.now() - t.detectedAt.getTime() < 24 * 60 * 60 * 1000
    );

    return {
      totalDevices: devices.length,
      authorizedDevices: devices.filter(d => d.isAuthorized).length,
      unauthorizedDevices: devices.filter(d => !d.isAuthorized).length,
      secureDevices: devices.filter(d => d.securityPosture === 'secure').length,
      vulnerableDevices: devices.filter(d => d.securityPosture === 'vulnerable' || d.securityPosture === 'compromised').length,
      unencryptedDevices: devices.filter(d => !d.isEncrypted).length,
      devicesWithVulnerableFirmware: Array.from(this.firmwareRegistry.values()).filter(
        f => f.hasKnownVulnerabilities
      ).length,
      threatsLast24h: recentThreats.length,
      criticalThreats: recentThreats.filter(t => t.severity === 'critical').length,
      botnetActivityDetected: recentThreats.filter(t => t.threatType === 'botnet-activity').length,
      edgeNodes: this.edgeNodes.size,
      secureEdgeNodes: Array.from(this.edgeNodes.values()).filter(n => n.isSecure).length,
    };
  }

  /**
   * Generate device inventory report
   */
  generateInventoryReport(): {
    totalDevices: number;
    devicesByType: Record<string, number>;
    devicesByPosture: Record<string, number>;
    unencryptedDevices: IoTDevice[];
    vulnerableDevices: IoTDevice[];
  } {
    const devices = Array.from(this.devices.values());
    
    const devicesByType: Record<string, number> = {};
    const devicesByPosture: Record<string, number> = {};

    devices.forEach(device => {
      devicesByType[device.deviceType] = (devicesByType[device.deviceType] || 0) + 1;
      devicesByPosture[device.securityPosture] = (devicesByPosture[device.securityPosture] || 0) + 1;
    });

    return {
      totalDevices: devices.length,
      devicesByType,
      devicesByPosture,
      unencryptedDevices: devices.filter(d => !d.isEncrypted),
      vulnerableDevices: devices.filter(d => 
        d.securityPosture === 'vulnerable' || d.securityPosture === 'compromised'
      ),
    };
  }
}

// Export singleton instance
export const iotSecurityManager = new IoTSecurityManager();
