/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

/**
 * Agent Activity Validation Schema
 * Used for logging agent actions across the system
 */
export const AgentActivitySchema = z.object({
  agentId: z.string().uuid('Agent ID must be a valid UUID'),
  action: z.string().min(1, 'Action must not be empty').max(200, 'Action must not exceed 200 characters'),
  resource: z.string().refine(
    (val) => {
      try {
        new URL(val);
        return true;
      } catch {
        return val.startsWith('/');
      }
    },
    { message: 'Resource must be a valid URL or start with /' }
  ),
  outcome: z.enum(['success', 'failure', 'blocked'], {
    error: 'Outcome must be success, failure, or blocked'
  }),
  timestamp: z.coerce.date(),
});

/**
 * Security Event Validation Schema
 * Used for recording security incidents and threats
 */
export const SecurityEventSchema = z.object({
  agentId: z.string().uuid('Agent ID must be a valid UUID'),
  eventType: z.string().min(1, 'Event type must not be empty').max(100),
  severity: z.enum(['low', 'medium', 'high', 'critical'], {
    error: 'Severity must be low, medium, high, or critical'
  }),
  description: z.string().max(1000, 'Description must not exceed 1000 characters').optional(),
  timestamp: z.coerce.date(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Telemetry Report Validation Schema
 * Used for periodic telemetry submissions
 */
export const TelemetryReportSchema = z.object({
  agentId: z.string().uuid('Agent ID must be a valid UUID').optional(),
  threatLevel: z.number().int().min(0).max(100, 'Threat level must be between 0 and 100'),
  status: z.string().min(1).max(50),
  timestamp: z.coerce.date().optional(),
  metrics: z.object({
    endpoint: z.record(z.string(), z.any()).optional(),
    network: z.record(z.string(), z.any()).optional(),
    dlp: z.record(z.string(), z.any()).optional(),
    identity: z.record(z.string(), z.any()).optional(),
  }).optional(),
});

/**
 * Agent Registration Schema
 * Used when registering a new agent in the system
 */
export const AgentRegistrationSchema = z.object({
  agentId: z.string().uuid('Agent ID must be a valid UUID'),
  name: z.string().min(1).max(100, 'Name must be between 1 and 100 characters'),
  type: z.string().min(1).max(50),
  capabilities: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  trustLevel: z.number().int().min(0).max(100).optional(),
});

/**
 * File Activity Schema
 * Used for monitoring file operations (ransomware detection)
 */
export const FileActivitySchema = z.object({
  agentId: z.string().uuid('Agent ID must be a valid UUID'),
  path: z.string().min(1),
  operation: z.enum(['read', 'write', 'delete', 'rename', 'execute']),
  timestamp: z.coerce.date().optional(),
  metadata: z.object({
    size: z.number().optional(),
    hash: z.string().optional(),
  }).optional(),
});

/**
 * Network Transfer Schema
 * Used for monitoring data exfiltration
 */
export const NetworkTransferSchema = z.object({
  agentId: z.string().uuid('Agent ID must be a valid UUID'),
  destination: z.string().url('Destination must be a valid URL'),
  bytesTransferred: z.number().int().min(0),
  protocol: z.enum(['http', 'https', 'ftp', 'sftp', 'smtp', 'other']),
  timestamp: z.coerce.date().optional(),
});

/**
 * Helper function to validate and parse data with Zod schemas
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

/**
 * Express middleware factory for request validation
 */
export function validateRequest(schema: z.ZodSchema) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.issues.map(err => ({
          path: err.path.join('.'),
          message: err.message,
        }))
      });
    }
    req.validatedBody = result.data;
    next();
  };
}
