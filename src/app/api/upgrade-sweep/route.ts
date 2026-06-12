import { NextResponse } from 'next/server';

import {
  MASSIVE_UPGRADE_SWEEP,
  determineApprovalPlan,
} from '@/lib/upgrade-sweep';
import {
  approveUpgradeJob,
  createUpgradeJob,
  ensureAutonomousSeedData,
  getAutonomousSettings,
  listUpgradeJobs,
} from '@/lib/autonomous-store';

const VALID_ACTIONS = new Set(['launch', 'approve']);
const MAX_BODY_LENGTH = 4096;

export async function GET() {
  await ensureAutonomousSeedData();
  const queue = await listUpgradeJobs();
  const queueByTarget = new Map(
    queue
      .filter(request => !['completed', 'failed'].includes(request.status))
      .map(request => [request.targetId, request]),
  );

  const history = queue
    .filter(request => request.status === 'completed' || request.status === 'failed')
    .slice(0, 50);

  return NextResponse.json({
    targets: MASSIVE_UPGRADE_SWEEP.map(target => ({
      ...target,
      approval: determineApprovalPlan(target),
      activeRequest: queueByTarget.get(target.targetId) ?? null,
    })),
    queue: queue.filter(request => !['completed', 'failed'].includes(request.status)),
    history,
    settings: await getAutonomousSettings(),
  });
}

export async function POST(request: Request) {
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_LENGTH) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
  }

  let body: { action?: string; targetId?: string; requestId?: string; autoCreated?: boolean };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || !body.action || !VALID_ACTIONS.has(body.action)) {
    return NextResponse.json({ error: 'action must be "launch" or "approve"' }, { status: 400 });
  }

  if (body.action === 'launch') {
    if (!body.targetId || typeof body.targetId !== 'string') {
      return NextResponse.json({ error: 'targetId is required' }, { status: 400 });
    }

    const requestItem = await createUpgradeJob(body.targetId, { autoCreated: body.autoCreated ?? false });
    if (!requestItem) {
      return NextResponse.json({ error: 'Unknown targetId' }, { status: 404 });
    }

    return NextResponse.json({ request: requestItem, deduped: false });
  }

  if (!body.requestId || typeof body.requestId !== 'string') {
    return NextResponse.json({ error: 'requestId is required' }, { status: 400 });
  }

  const approved = await approveUpgradeJob(body.requestId);
  if (!approved) {
    return NextResponse.json({ error: 'Unknown requestId' }, { status: 404 });
  }

  return NextResponse.json({ request: approved });
}
