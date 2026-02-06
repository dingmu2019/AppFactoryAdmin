import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DebateService } from './debateService';

// Mock Supabase Client using vi.hoisted to avoid reference errors
const mocks = vi.hoisted(() => {
  const mockInsert = vi.fn();
  const mockSelect = vi.fn();
  const mockSingle = vi.fn();
  const mockEq = vi.fn();
  const mockUpdate = vi.fn();

  // Chainable helper
  const chain = {
    insert: mockInsert,
    select: mockSelect,
    single: mockSingle,
    eq: mockEq,
    update: mockUpdate,
  };
  
  mockInsert.mockReturnValue(chain);
  mockSelect.mockReturnValue(chain);
  mockUpdate.mockReturnValue(chain);
  mockEq.mockReturnValue(chain);
  mockSingle.mockReturnValue(chain);

  return {
    mockInsert,
    mockSelect,
    mockSingle,
    mockEq,
    mockUpdate,
    mockFrom: vi.fn().mockReturnValue(chain),
  };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mocks.mockFrom,
  })),
}));

// Mock global fetch for LLM calls
global.fetch = vi.fn();

describe('DebateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createDebate', () => {
    it('should create a debate successfully', async () => {
      // 1. Mock LLM Response (generateAgents)
      const mockAgents = [
        { name: 'Alice', role: 'Supporter', stance: 'Pro', avatar: '👩' },
        { name: 'Bob', role: 'Opponent', stance: 'Con', avatar: '👨' }
      ];
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(''), // fallback for error check
        json: async () => ({ 
          content: JSON.stringify(mockAgents) 
        }),
      });

      // 2. Mock Database Response
      mocks.mockSingle.mockResolvedValue({
        data: { 
          id: 'debate-123', 
          topic: 'Test Topic',
          participants: mockAgents,
          status: 'pending' 
        },
        error: null
      });

      // 3. Execute
      const config = {
        topic: 'Test Topic',
        mode: 'free_discussion' as const,
        duration: 10,
        entropy: 0.8,
        user_id: 'user-uuid-123',
        enable_environment_awareness: true
      };

      const result = await DebateService.createDebate(config);

      // 4. Assertions
      expect(result).toBeDefined();
      expect(result.id).toBe('debate-123');
      expect(result.participants).toHaveLength(2);
      
      // Verify DB call
      expect(mocks.mockFrom).toHaveBeenCalledWith('agent_debates');
      expect(mocks.mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        topic: 'Test Topic',
        mode: 'free_discussion',
        user_id: 'user-uuid-123',
        enable_environment_awareness: true
      }));
    });
  });
});
