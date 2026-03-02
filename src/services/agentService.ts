import { authenticatedFetch } from '@/lib/http';
import type { Agent } from '@/app/sys/ai-agent/components/AgentCard';

const API_BASE = '/api/admin/agents';

export const getAgents = async (): Promise<Agent[]> => {
  const res = await authenticatedFetch(API_BASE);
  if (!res.ok) throw new Error('Failed to fetch agents');
  return await res.json();
};

export const createAgent = async (agent: Partial<Agent>): Promise<Agent> => {
  const res = await authenticatedFetch(API_BASE, {
    method: 'POST',
    body: JSON.stringify(agent),
  });
  if (!res.ok) throw new Error('Failed to create agent');
  return await res.json();
};

export const updateAgent = async (id: string, agent: Partial<Agent>): Promise<Agent> => {
  const res = await authenticatedFetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(agent),
  });
  if (!res.ok) throw new Error('Failed to update agent');
  return await res.json();
};

export const toggleAgentStatus = async (id: string, isActive: boolean): Promise<Agent> => {
  const res = await authenticatedFetch(`${API_BASE}/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
  });
  if (!res.ok) throw new Error('Failed to update agent status');
  return await res.json();
};

export const deleteAgent = async (id: string): Promise<void> => {
  const res = await authenticatedFetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete agent');
};

export const reorderAgents = async (ids: string[]): Promise<void> => {
  const res = await authenticatedFetch(`${API_BASE}/reorder`, {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error('Failed to reorder agents');
};

// Prompts
export const getAgentPrompts = async (id: string): Promise<any[]> => {
  const res = await authenticatedFetch(`${API_BASE}/${id}/prompts`);
  if (!res.ok) throw new Error('Failed to load prompts');
  return await res.json();
};

export const upsertAgentPrompts = async (id: string, prompts: any[]): Promise<any[]> => {
  const res = await authenticatedFetch(`${API_BASE}/${id}/prompts`, {
    method: 'POST',
    body: JSON.stringify(prompts),
  });
  if (!res.ok) throw new Error('Failed to save prompts');
  return await res.json();
};

export const deleteAgentPrompt = async (agentId: string, promptId: string): Promise<void> => {
  const res = await authenticatedFetch(`${API_BASE}/${agentId}/prompts/${promptId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete prompt');
};
