
import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { supabase } from "@/lib/supabase";
import { useI18n } from '@/contexts';

interface DebateDetail {
  id: string;
  topic: string;
  mode: string;
  status: string;
  participants: any[];
  summary: string;
  messages: any[];
  started_at: string;
  duration_limit: number;
  scroll_mode: 'auto' | 'manual';
}

export const useDebateDetail = (id: string | undefined) => {
  const { t } = useI18n();
  const [debate, setDebate] = useState<DebateDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isOrchestratingRef = useRef(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const orchestrationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDetail = async () => {
    if (!id) return null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const response = await fetch(`/api/ai/debates/${id}`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
      });
      
      if (response.status === 401) {
          console.error('Unauthorized access to debate detail');
          throw new Error(t('auth.loginRequired'));
      }

      if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          console.error('API Error:', response.status, err);
          throw new Error(err.error || t('common.loadFailed'));
      }
      
      const data = await response.json();
      if (data.summary && data.status === 'completed') {
          const hasSummaryMsg = data.messages.some((m: any) => m.is_summary_report);
          if (!hasSummaryMsg) {
              data.messages.push({ id: 'summary-report-msg', agent_name: 'System', role: 'Judge', content: `**${t('aiDebates.summaryReportTitle')}**\n\n${data.summary}`, is_summary_report: true, created_at: new Date().toISOString() });
          }
      }
      setDebate(data);
      return data;
    } catch (error) {
      console.error(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    
    // Initial fetch
    fetchDetail();

    // Realtime Subscription
    const channel = supabase
        .channel(`debate_detail:${id}`)
        .on(
            'postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'debate_messages', filter: `debate_id=eq.${id}` },
            (payload) => {
                setDebate(prev => {
                    if (!prev) return prev;
                    if (prev.messages.some(m => m.id === payload.new.id)) return prev;
                    // Auto-update timer if status is running but no timer yet (e.g. recovered by Cron)
                    if (prev.status === 'running' && !timeLeft && prev.started_at) {
                        const startTime = new Date(prev.started_at).getTime();
                        const durationMs = prev.duration_limit * 60 * 1000;
                        const endTime = startTime + durationMs;
                        if (Date.now() < endTime) {
                            // Trigger re-render to start timer effect
                        }
                    }
                    return { ...prev, messages: [...prev.messages, payload.new] };
                });
            }
        )
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'agent_debates', filter: `id=eq.${id}` },
            (payload) => {
                setDebate(prev => {
                    if (!prev) return prev;
                    const updated = { ...prev, ...payload.new };
                    
                    // If completed and has summary, ensure summary message exists
                    if (updated.status === 'completed' && updated.summary) {
                         const hasSummaryMsg = updated.messages.some((m: any) => m.is_summary_report);
                         if (!hasSummaryMsg) {
                             updated.messages = [...updated.messages, {
                                 id: 'summary-report-msg',
                                 agent_name: 'System',
                                 role: 'Judge',
                                 content: `**${t('aiDebates.summaryReportTitle')}**\n\n${updated.summary}`,
                                 is_summary_report: true,
                                 created_at: new Date().toISOString()
                             }];
                         }
                    }
                    return updated;
                });
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, [id, t]);

  useLayoutEffect(() => {
    if (debate?.scroll_mode === 'manual') return; // 手动模式下不自动滚动
    if (isAtBottomRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [debate?.messages, debate?.scroll_mode]);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
  };

  useEffect(() => {
    if (debate?.status === 'running' && debate.started_at && debate.duration_limit) {
      const updateTimer = () => {
        const startTime = new Date(debate.started_at).getTime();
        const durationMs = debate.duration_limit * 60 * 1000;
        const endTime = startTime + durationMs;
        const now = Date.now();
        const diff = endTime - now;
        if (diff <= 0) setTimeLeft('00:00');
        else {
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [debate?.status, debate?.started_at, debate?.duration_limit]);

  useEffect(() => {
    if (debate?.status === 'running' && id) {
      const processRound = async () => {
        if (isOrchestratingRef.current) return;
        
        // Simple client-side pacing: wait 5-10s between rounds
        const delay = Math.random() * 5000 + 5000;
        orchestrationTimerRef.current = setTimeout(async () => {
            if (debate.status !== 'running') return;
            
            isOrchestratingRef.current = true;
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return; // Need to be logged in
                
                const response = await fetch(`/api/ai/debates/${id}/round`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json' 
                    }
                });
                
                if (response.ok) {
                    const result = await response.json();
                    if (result.finished) {
                        fetchDetail(); // Finalize
                    }
                }
            } catch (err) {
                console.error('[Orchestrator] Round failed:', err);
            } finally {
                isOrchestratingRef.current = false;
                // Trigger next check after this one finishes
                // This replaces the state-dependency loop with a controlled recursion
                processRound(); 
            }
        }, delay);
      };

      processRound();
    }
    
    return () => {
        if (orchestrationTimerRef.current) clearTimeout(orchestrationTimerRef.current);
    };
  }, [debate?.status, id]);

  return { debate, setDebate, isLoading, timeLeft, messagesEndRef, messagesContainerRef, handleScroll, fetchDetail };
};
export type { DebateDetail };
