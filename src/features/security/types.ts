// Canonical security types — consolidated from security-types.ts + settings.ts
export type SecurityLevel = 'passive' | 'active' | 'configurable';

export type SecurityResult = {
  approved: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  warnings: string[];
  blockedReasons: string[];
  requiresConfirmation?: boolean;
};

export type SecurityEvent = {
  id: string;
  timestamp: Date;
  action: string;
  result: SecurityResult;
};
