import { NextResponse } from 'next/server';
import { securityMiddleware } from '@/lib/security-middleware';
import {
  executeBusinessSkill, executeMultipleSkills,
  runDailyBusinessRoutine, runWeeklyBusinessRoutine,
} from '@/lib/business/bridge';
import { BUSINESS_SKILLS, getSkillsByCategory } from '@/lib/business/skills';
import {
  getAccounts, getBudgets, getRevenueStreams,
  getRecentTransactions, getFinancialHealth,
  addTransaction, initFinance, DEFAULT_ACCOUNTS, DEFAULT_BUDGETS, DEFAULT_REVENUE,
} from '@/lib/business/finance';
import type { BusinessSkillId } from '@/lib/business/skills';

// Initialize with defaults
let initialized = false;
function ensureInit() {
  if (!initialized) {
    initFinance(DEFAULT_ACCOUNTS, DEFAULT_BUDGETS, DEFAULT_REVENUE);
    initialized = true;
  }
}

export async function GET(request: Request) {
  ensureInit();
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'status';

  try {
    switch (action) {
      case 'status': {
        const health = getFinancialHealth();
        return NextResponse.json({
          skills: {
            total: BUSINESS_SKILLS.length,
            byCategory: {
              marketing: getSkillsByCategory('marketing').length,
              finance: getSkillsByCategory('finance').length,
              growth: getSkillsByCategory('growth').length,
              operations: getSkillsByCategory('operations').length,
            },
          },
          finance: {
            accounts: getAccounts(),
            budgets: getBudgets(),
            revenueStreams: getRevenueStreams(),
            health,
          },
          transactions: getRecentTransactions(10),
        });
      }

      case 'accounts':
        return NextResponse.json({ accounts: getAccounts() });

      case 'budgets':
        return NextResponse.json({ budgets: getBudgets(), utilization: getFinancialHealth() });

      case 'revenue':
        return NextResponse.json({ streams: getRevenueStreams(), health: getFinancialHealth() });

      case 'skills':
        return NextResponse.json({ skills: BUSINESS_SKILLS });

      case 'transactions':
        return NextResponse.json({ transactions: getRecentTransactions(50) });

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  ensureInit();

  try {
    const body = await request.json();
    const { action } = body as { action: string };

    // Security check via Claw Protect
    const securityResult = await securityMiddleware.validateAction(
      `business:${action}`,
      { _tier: 'full', ...body } as Record<string, unknown>
    );

    if (!securityResult.approved) {
      return NextResponse.json({
        error: 'Claw Protect blocked this operation',
        blockedReasons: securityResult.blockedReasons,
      }, { status: 403 });
    }

    switch (action) {
      case 'execute-skill': {
        const { skill, skillAction, params } = body as {
          skill: BusinessSkillId; skillAction: string; params: Record<string, unknown>;
        };
        const result = await executeBusinessSkill({ skill, action: skillAction, params });
        return NextResponse.json({ result });
      }

      case 'run-daily': {
        const results = await runDailyBusinessRoutine();
        return NextResponse.json({ results, routine: 'daily' });
      }

      case 'run-weekly': {
        const results = await runWeeklyBusinessRoutine();
        return NextResponse.json({ results, routine: 'weekly' });
      }

      case 'record-transaction': {
        const { date, description, amount, type, category, accountId, tags } = body as any;
        const tx = addTransaction({
          date: date || new Date().toISOString(),
          description, amount, type, category, accountId, tags: tags || [],
        });
        return NextResponse.json({ transaction: tx });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
