import type { CustomAgent } from '@/features/agents/types';

const API_BASE = '/api/agents';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function getAgents(): Promise<CustomAgent[]> {
  const res = await fetch(API_BASE, { cache: 'no-store' });
  return handleResponse<CustomAgent[]>(res);
}

export async function saveAgent(agent: CustomAgent): Promise<CustomAgent> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(agent),
  });
  return handleResponse<CustomAgent>(res);
}

export async function deleteAgent(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}?id=${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`API error ${res.status}: ${text}`);
  }
}

export async function toggleAgent(id: string, enabled: boolean): Promise<void> {
  const res = await fetch(API_BASE, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, enabled }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`API error ${res.status}: ${text}`);
  }
}

export async function updateAgentTier(id: string, securityTier: string): Promise<void> {
  const res = await fetch(API_BASE, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, securityTier }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`API error ${res.status}: ${text}`);
  }
}