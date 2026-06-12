import { Prisma } from '@prisma/client';

import { db } from '@/lib/db';
import {
  AUTONOMOUS_AGENT_PRESETS,
  DEFAULT_AUTONOMOUS_SETTINGS,
  estimateNextRun,
  type AutonomousModeSettings,
  type ExecutionLog,
  type ScheduledAgent,
} from '@/lib/autonomous-agents';
import {
  MASSIVE_UPGRADE_SWEEP,
  buildUpgradeRequestMessage,
  determineApprovalPlan,
  type UpgradeLaunchRequest,
} from '@/lib/upgrade-sweep';

function normalizeAgentSkills(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeConfig(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toJsonArray(values: string[]): Prisma.InputJsonValue {
  return values as Prisma.InputJsonValue;
}

function toJsonObject(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toNullableJsonValue(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (value === undefined || value === null) {
    return Prisma.JsonNull;
  }
  return value as Prisma.InputJsonValue;
}

function mapAgentRecord(record: {
  id: string;
  name: string;
  description: string;
  cronExpression: string;
  skills: unknown;
  status: string;
  lastRun: Date | null;
  nextRun: Date | null;
  executionCount: number;
  successCount: number;
  failureCount: number;
  enabled: boolean;
  config: unknown;
}): ScheduledAgent {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    cronExpression: record.cronExpression,
    skills: normalizeAgentSkills(record.skills),
    status: record.status as ScheduledAgent['status'],
    lastRun: record.lastRun?.toISOString(),
    nextRun: record.nextRun?.toISOString(),
    executionCount: record.executionCount,
    successCount: record.successCount,
    failureCount: record.failureCount,
    enabled: record.enabled,
    config: normalizeConfig(record.config),
  };
}

function mapRunRecord(record: {
  agentId: string;
  status: string;
  duration: number;
  output: unknown;
  error: string | null;
  createdAt: Date;
}): ExecutionLog {
  return {
    agentId: record.agentId,
    timestamp: record.createdAt.toISOString(),
    status: record.status as ExecutionLog['status'],
    duration: record.duration,
    output: record.output ?? undefined,
    error: record.error ?? undefined,
  };
}

function mapSettingsRecord(record: {
  enabled: boolean;
  policyLevel: string;
  autoConfigure: boolean;
  autoUpgradeSafe: boolean;
  resumeOnRestart: boolean;
  lastConfiguredAt: Date | null;
}): AutonomousModeSettings {
  return {
    enabled: record.enabled,
    policyLevel: record.policyLevel as AutonomousModeSettings['policyLevel'],
    autoConfigure: record.autoConfigure,
    autoUpgradeSafe: record.autoUpgradeSafe,
    resumeOnRestart: record.resumeOnRestart,
    lastConfiguredAt: record.lastConfiguredAt?.toISOString(),
  };
}

export async function ensureAutonomousSeedData(): Promise<void> {
  await db.autonomousSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      ...DEFAULT_AUTONOMOUS_SETTINGS,
    },
  });

  for (const preset of AUTONOMOUS_AGENT_PRESETS) {
    await db.autonomousAgent.upsert({
      where: { id: preset.id },
      update: {
        name: preset.name,
        description: preset.description,
        skills: toJsonArray(preset.skills),
        config: toJsonObject(preset.config),
      },
      create: {
        id: preset.id,
        name: preset.name,
        description: preset.description,
        cronExpression: preset.cronExpression,
        skills: toJsonArray(preset.skills),
        status: preset.status,
        executionCount: preset.executionCount,
        successCount: preset.successCount,
        failureCount: preset.failureCount,
        enabled: preset.enabled,
        config: toJsonObject(preset.config),
        nextRun: estimateNextRun(preset.cronExpression) ? new Date(estimateNextRun(preset.cronExpression) as string) : null,
      },
    });
  }
}

export async function listAutonomousAgents(): Promise<ScheduledAgent[]> {
  const records = await db.autonomousAgent.findMany({ orderBy: { name: 'asc' } });
  return records.map(mapAgentRecord);
}

export async function getAutonomousAgent(agentId: string): Promise<ScheduledAgent | null> {
  const record = await db.autonomousAgent.findUnique({ where: { id: agentId } });
  return record ? mapAgentRecord(record) : null;
}

export async function updateAutonomousAgent(agentId: string, updates: Partial<Pick<ScheduledAgent, 'enabled' | 'cronExpression' | 'status' | 'lastRun' | 'nextRun' | 'executionCount' | 'successCount' | 'failureCount'>>): Promise<ScheduledAgent> {
  const record = await db.autonomousAgent.update({
    where: { id: agentId },
    data: {
      ...(updates.enabled !== undefined ? { enabled: updates.enabled } : {}),
      ...(updates.cronExpression ? { cronExpression: updates.cronExpression } : {}),
      ...(updates.status ? { status: updates.status } : {}),
      ...(updates.lastRun !== undefined ? { lastRun: updates.lastRun ? new Date(updates.lastRun) : null } : {}),
      ...(updates.nextRun !== undefined ? { nextRun: updates.nextRun ? new Date(updates.nextRun) : null } : {}),
      ...(updates.executionCount !== undefined ? { executionCount: updates.executionCount } : {}),
      ...(updates.successCount !== undefined ? { successCount: updates.successCount } : {}),
      ...(updates.failureCount !== undefined ? { failureCount: updates.failureCount } : {}),
    },
  });

  return mapAgentRecord(record);
}

export async function recordAutonomousRun(log: ExecutionLog): Promise<void> {
  await db.autonomousAgentRun.create({
    data: {
      agentId: log.agentId,
      status: log.status,
      duration: log.duration,
        output: toNullableJsonValue(log.output),
      error: log.error ?? null,
      createdAt: new Date(log.timestamp),
    },
  });
}

export async function listAutonomousRuns(agentId?: string, limit = 100): Promise<ExecutionLog[]> {
  const records = await db.autonomousAgentRun.findMany({
    where: agentId ? { agentId } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return records.map(mapRunRecord);
}

export async function getAutonomousSettings(): Promise<AutonomousModeSettings> {
  const record = await db.autonomousSettings.findUnique({ where: { id: 'default' } });
  return record ? mapSettingsRecord(record) : DEFAULT_AUTONOMOUS_SETTINGS;
}

export async function updateAutonomousSettings(updates: Partial<AutonomousModeSettings>): Promise<AutonomousModeSettings> {
  const record = await db.autonomousSettings.upsert({
    where: { id: 'default' },
    update: {
      ...(updates.enabled !== undefined ? { enabled: updates.enabled } : {}),
      ...(updates.policyLevel ? { policyLevel: updates.policyLevel } : {}),
      ...(updates.autoConfigure !== undefined ? { autoConfigure: updates.autoConfigure } : {}),
      ...(updates.autoUpgradeSafe !== undefined ? { autoUpgradeSafe: updates.autoUpgradeSafe } : {}),
      ...(updates.resumeOnRestart !== undefined ? { resumeOnRestart: updates.resumeOnRestart } : {}),
      ...(updates.lastConfiguredAt !== undefined ? { lastConfiguredAt: updates.lastConfiguredAt ? new Date(updates.lastConfiguredAt) : null } : {}),
    },
    create: {
      id: 'default',
      ...DEFAULT_AUTONOMOUS_SETTINGS,
      ...updates,
      lastConfiguredAt: updates.lastConfiguredAt ? new Date(updates.lastConfiguredAt) : null,
    },
  });

  return mapSettingsRecord(record);
}

export async function autoConfigureAutonomousMode(): Promise<AutonomousModeSettings> {
  for (const preset of AUTONOMOUS_AGENT_PRESETS) {
    await db.autonomousAgent.update({
      where: { id: preset.id },
      data: {
        enabled: true,
        cronExpression: preset.cronExpression,
        nextRun: estimateNextRun(preset.cronExpression) ? new Date(estimateNextRun(preset.cronExpression) as string) : null,
      },
    });
  }

  return updateAutonomousSettings({
    enabled: true,
    policyLevel: 'conservative',
    autoConfigure: true,
    autoUpgradeSafe: true,
    resumeOnRestart: true,
    lastConfiguredAt: new Date().toISOString(),
  });
}

function mapUpgradeJob(record: {
  id: string;
  createdAt: Date;
  createdBy: string;
  targetId: string;
  targetName: string;
  summary: string;
  requestMessage: string;
  approvalTier: string;
  approvalRequired: boolean;
  autoExecute: boolean;
  approvalRationale: string;
  status: string;
  recommendedRepos: unknown;
  report: unknown;
}): UpgradeLaunchRequest {
  return {
    requestId: record.id,
    createdAt: record.createdAt.toISOString(),
    requestedBy: record.createdBy,
    targetId: record.targetId,
    targetName: record.targetName,
    summary: record.summary,
    requestMessage: record.requestMessage,
    approvalTier: record.approvalTier as UpgradeLaunchRequest['approvalTier'],
    approvalRequired: record.approvalRequired,
    autoExecute: record.autoExecute,
    approvalRationale: record.approvalRationale,
    status: record.status as UpgradeLaunchRequest['status'],
    recommendedRepos: Array.isArray(record.recommendedRepos) ? record.recommendedRepos as UpgradeLaunchRequest['recommendedRepos'] : [],
    report: record.report && typeof record.report === 'object' ? record.report as UpgradeLaunchRequest['report'] : undefined,
  };
}

export async function listUpgradeJobs(): Promise<UpgradeLaunchRequest[]> {
  const records = await db.autonomousUpgradeJob.findMany({ orderBy: { createdAt: 'desc' } });
  return records.map(mapUpgradeJob);
}

export async function createUpgradeJob(targetId: string, options?: { autoCreated?: boolean }): Promise<UpgradeLaunchRequest | null> {
  const target = MASSIVE_UPGRADE_SWEEP.find(item => item.targetId === targetId);
  if (!target) {
    return null;
  }

  const existing = await db.autonomousUpgradeJob.findFirst({
    where: {
      targetId,
      status: { in: ['queued', 'awaiting_approval', 'running'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    return mapUpgradeJob(existing);
  }

  const approval = determineApprovalPlan(target);
  const id = `upgrade-${Date.now()}-${target.targetId}`;
  const record = await db.autonomousUpgradeJob.create({
    data: {
      id,
      targetId: target.targetId,
      targetName: target.targetName,
      summary: target.summary,
      requestMessage: buildUpgradeRequestMessage(target),
      approvalTier: approval.tier,
      approvalRequired: approval.approvalRequired,
      autoExecute: approval.autoExecute,
      approvalRationale: approval.rationale,
      status: approval.autoExecute ? 'queued' : 'awaiting_approval',
      recommendedRepos: target.recommendedRepos as unknown as Prisma.InputJsonValue,
      autoCreated: options?.autoCreated ?? false,
    },
  });

  return mapUpgradeJob(record);
}

export async function approveUpgradeJob(requestId: string): Promise<UpgradeLaunchRequest | null> {
  const existing = await db.autonomousUpgradeJob.findUnique({ where: { id: requestId } });
  if (!existing) {
    return null;
  }

  const updated = await db.autonomousUpgradeJob.update({
    where: { id: requestId },
    data: {
      status: 'queued',
      approvalRequired: false,
      autoExecute: true,
    },
  });

  return mapUpgradeJob(updated);
}
