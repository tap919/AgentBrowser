import { NextResponse } from 'next/server';

import { agentScheduler } from '@/lib/agent-scheduler';
import {
  autoConfigureAutonomousMode,
  getAutonomousSettings,
  updateAutonomousSettings,
} from '@/lib/autonomous-store';
import type { AutonomousModeSettings } from '@/lib/autonomous-agents';

interface UpdateBody {
  id?: string;
  enabled?: boolean;
  cronExpression?: string;
  settings?: Partial<AutonomousModeSettings>;
  autoConfigure?: boolean;
}

export async function GET() {
  await agentScheduler.initialize();
  return NextResponse.json({
    agents: agentScheduler.getAgents(),
    logs: agentScheduler.getExecutionLogs(),
    stats: agentScheduler.getStats(),
    settings: await getAutonomousSettings(),
  });
}

export async function PUT(request: Request) {
  let body: UpdateBody;
  try {
    body = await request.json() as UpdateBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.autoConfigure) {
    const settings = await autoConfigureAutonomousMode();
    await agentScheduler.refreshAgents();
    return NextResponse.json({
      settings,
      agents: agentScheduler.getAgents(),
      logs: agentScheduler.getExecutionLogs(),
      stats: agentScheduler.getStats(),
    });
  }

  if (body.settings) {
    const settings = await updateAutonomousSettings(body.settings);
    await agentScheduler.refreshAgents();
    return NextResponse.json({ settings });
  }

  if (!body.id || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const updates: UpdateBody = {};
  if (typeof body.enabled === 'boolean') {
    updates.enabled = body.enabled;
  }
  if (typeof body.cronExpression === 'string' && body.cronExpression.trim()) {
    updates.cronExpression = body.cronExpression.trim();
  }

  try {
    await agentScheduler.updateAgent(body.id, updates);
    return NextResponse.json({ agent: agentScheduler.getAgent(body.id) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update agent' },
      { status: 400 },
    );
  }
}
