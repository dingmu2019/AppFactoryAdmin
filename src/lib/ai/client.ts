
import { authenticatedFetch } from '@/lib/http';

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string | any[];
  name?: string;
};

export async function callLLM(messages: ChatMessage[], systemPrompt?: string, agentId?: string) {
  const res = await authenticatedFetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, systemPrompt, agentId })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to call LLM (${res.status})`);
  }

  const data = await res.json();
  return data.content;
}
