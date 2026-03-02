import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DebateService } from './debateService';

const mocks = vi.hoisted(() => {
  const insertPayloads: any[] = [];
  const mockInsert = vi.fn((payload: any) => {
    insertPayloads.push(structuredClone(payload));
    return chain;
  });
  const mockSelect = vi.fn();
  const mockSingle = vi.fn();
  const mockFrom = vi.fn();

  const chain = {
    insert: mockInsert,
    select: mockSelect,
    single: mockSingle,
  };

  mockSelect.mockReturnValue(chain);

  return {
    insertPayloads,
    mockInsert,
    mockSelect,
    mockSingle,
    mockFrom: mockFrom.mockReturnValue(chain),
  };
});

vi.mock('../../lib/supabase', () => {
  return {
    supabase: {
      from: mocks.mockFrom,
    },
  };
});

vi.mock('./generator.ts', () => ({
  DebateGenerator: {
    generateAgents: vi.fn(async () => [
      { name: 'A', role: 'Chief AI Scientist', stance: 'Pro', avatar: '🧑‍🔬' },
      { name: 'B', role: 'Security Expert', stance: 'Con', avatar: '🛡️' },
    ]),
  },
}));

describe('DebateService.createDebate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retries insert without new columns when schema is missing', async () => {
    mocks.mockSingle
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'column "enable_environment_awareness" of relation "agent_debates" does not exist' },
      })
      .mockResolvedValueOnce({
        data: { id: 'debate-1', topic: 't', status: 'pending' },
        error: null,
      });

    const debate = await DebateService.createDebate({
      topic: 't',
      mode: 'free_discussion',
      duration: 5,
      entropy: 0.5,
      user_id: 'user-1',
      enable_environment_awareness: true,
      scroll_mode: 'auto',
    });

    expect(debate.id).toBe('debate-1');
    expect(mocks.mockInsert).toHaveBeenCalledTimes(2);

    const firstPayload = mocks.insertPayloads[0];
    const secondPayload = mocks.insertPayloads[1];
    expect(firstPayload.enable_environment_awareness).toBe(true);
    expect(firstPayload.scroll_mode).toBe('auto');
    expect(secondPayload.enable_environment_awareness).toBeUndefined();
    expect(secondPayload.scroll_mode).toBeUndefined();
  });
});
