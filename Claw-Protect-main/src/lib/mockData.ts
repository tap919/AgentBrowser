export const mockTelemetry = {
  endpoint: {
    status: "Protected",
    lastScan: "2026-04-11 15:30:00",
    malwareDetected: 0,
    activeProcesses: 142,
    cpuUsage: "12%",
    memoryUsage: "4.2GB / 16GB",
    usbDevices: ["Internal Keyboard", "Internal Trackpad"],
  },
  network: {
    inbound: "1.2 MB/s",
    outbound: "450 KB/s",
    activeConnections: 24,
    blockedDomains: 12,
    vpnStatus: "Connected (Zero Trust)",
    anomalies: ["Unusual beaconing to 192.168.1.50 (Internal)"],
  },
  dlp: {
    classifiedFiles: 1420,
    sensitiveDataLeaks: 0,
    exfiltrationAttempts: 0,
    lastAudit: "2026-04-11 12:00:00",
  },
  identity: {
    mfaStatus: "Enforced (FIDO2)",
    lastLogin: "2026-04-11 08:45:00 from San Francisco, CA",
    privilegedAccess: "User (Least Privilege)",
    sessionAnomalies: 0,
  }
};

export const mockAlerts = [
  {
    id: "1",
    type: "Network",
    severity: "Medium",
    message: "Unusual outbound traffic detected to unknown IP in Eastern Europe.",
    timestamp: "2026-04-11 15:45:22",
  },
  {
    id: "2",
    type: "Endpoint",
    severity: "Low",
    message: "New USB device 'Generic Mass Storage' blocked by peripheral control.",
    timestamp: "2026-04-11 14:12:05",
  },
  {
    id: "3",
    type: "Identity",
    severity: "High",
    message: "MFA fatigue attack detected. Multiple denied requests from Moscow, RU.",
    timestamp: "2026-04-11 10:30:15",
  }
];
