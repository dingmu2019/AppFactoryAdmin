
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useI18n, useToast } from '@/contexts';
import { DebateHeader } from './components/DebateHeader';
import { DebateOverviewBar } from './components/DebateOverviewBar';
import { SummaryMessage } from './components/SummaryMessage';
import { DebateMessageItem } from './components/DebateMessageItem';
import { DebateSidebar } from './components/DebateSidebar';
import { OrchestrationMessage } from './components/OrchestrationMessage';
import { useDebateDetail } from './hooks/useDebateDetail';
import { handleExportPDFMsg, handleExportPDFChat, handleExportScreenshot } from './utils/exportUtils';

export default function DebateDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  
  const { debate, isLoading, timeLeft, messagesEndRef, messagesContainerRef, handleScroll, fetchDetail } = useDebateDetail(id);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({});
  const [showThinking, setShowThinking] = useState(true);
  const [viewMode, setViewMode] = useState<'result' | 'timeline'>('timeline');
  const [focusAgent, setFocusAgent] = useState('__all__');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const summaryMsg = useMemo(() => {
    const msgs = Array.isArray(debate?.messages) ? debate.messages : [];
    const summaries = msgs.filter((m: any) => m?.is_summary_report);
    return summaries.length ? summaries[summaries.length - 1] : null;
  }, [debate?.messages]);

  const hasSummary = Boolean(summaryMsg) || Boolean(debate?.summary);

  // Set initial view mode to result if summary exists
  useEffect(() => {
    if (hasSummary) {
      setViewMode('result');
    }
  }, [hasSummary]);

  const effectiveViewMode = hasSummary ? viewMode : 'timeline';

  const filteredMessages = useMemo(() => {
    const msgs = Array.isArray(debate?.messages) ? debate.messages : [];
    return msgs.filter((m: any) => {
      if (m?.is_summary_report) return false;
      if (focusAgent === '__all__') return true;
      return m?.agent_name === focusAgent;
    });
  }, [debate?.messages, effectiveViewMode, focusAgent]);

  const handleDelete = () => {
    setConfirmModal({
        isOpen: true,
        title: t('common.ai.debatesPage.detail.deleteTitle'),
        message: t('common.ai.debatesPage.detail.deleteConfirm'),
        onConfirm: async () => {
            if (!id) return;
            setIsDeleting(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                const response = await fetch(`/api/ai/debates/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error(t('common.deleteFailed'));
                showToast(t('common.deleteSuccess'), 'success');
                router.push('/ai-debates');
            } catch (err) {
                console.error(err);
                showToast(t('common.deleteFailed'), 'error');
            } finally { setIsDeleting(false); }
        }
    });
  };

  const handleStop = () => {
    setConfirmModal({
        isOpen: true,
        title: t('common.ai.debatesPage.detail.stop'),
        message: t('common.ai.debatesPage.detail.stopConfirm'),
        onConfirm: async () => {
            if (!id) return;
            setIsStopping(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                const response = await fetch(`/api/ai/debates/${id}/stop`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error(t('common.ai.debatesPage.detail.stopFailed'));
                showToast(t('common.ai.debatesPage.detail.stopSuccess'), 'success');
                fetchDetail();
            } catch (err) {
                console.error(err);
                showToast(t('common.ai.debatesPage.detail.stopFailed'), 'error');
            } finally { setIsStopping(false); }
        }
    });
  };

  const handleShare = async () => {
    if (!id || isSharing) return;
    setIsSharing(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const res = await fetch(`/api/ai/debates/${id}/share`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || t('common.ai.debatesPage.detail.shareFailed'));
        }
        
        const data = await res.json();
        const shareToken = data?.token;
        if (!shareToken) throw new Error(t('common.ai.debatesPage.detail.shareFailed'));
        
        // Use current origin to ensure link works for the user
        const url = `${window.location.origin}/share/debate/${shareToken}`;
        const topic = typeof data?.topic === 'string' ? data.topic : (debate?.topic || '');
        const copyText = `${t('common.ai.debatesPage.detail.topicLabel')}: ${topic}\n${t('common.ai.debatesPage.detail.publicLinkLabel')}: ${url}`;
        
        await handleCopy(copyText, false); // Pass false to avoid double success toast
        showToast(t('common.ai.debatesPage.detail.shareCopied'), 'success');
    } catch (err: any) {
        console.error('Share failed:', err);
        showToast(err?.message || t('common.ai.debatesPage.detail.shareFailed'), 'error');
    } finally {
        setIsSharing(false);
    }
  };

  const handleScreenshot = async (elementId: string) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    showToast(t('common.ai.assistant.preparingScreenshot'), 'info');
    try {
        const result = await handleExportScreenshot(elementId, `debate-${id}-${elementId}`);
        if (result?.method === 'clipboard') {
            showToast(t('common.ai.assistant.screenshotToClipboard'), 'success');
        } else {
            showToast(t('common.ai.assistant.screenshotExported'), 'success');
        }
    } catch (err) {
        console.error(err);
        showToast(t('common.ai.assistant.screenshotFailed'), 'error');
    }
  };

  const handleCopy = async (text: string, shouldShowToast = true) => {
    if (!text) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        if (shouldShowToast) showToast(t('common.copySuccess'), 'success');
      } else {
        // Fallback for non-secure contexts or older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          if (shouldShowToast) showToast(t('common.copySuccess'), 'success');
        } catch (err) {
          console.error('Fallback copy failed', err);
          if (shouldShowToast) showToast(t('common.copyFailed'), 'error');
        }
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error('Copy failed', err);
      if (shouldShowToast) showToast(t('common.copyFailed'), 'error');
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-full bg-zinc-50 dark:bg-zinc-950"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
  
  if (!debate) return (
    <div className="flex flex-col items-center justify-center h-full bg-zinc-50 dark:bg-zinc-950 text-zinc-500 p-4 text-center">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4">
            <MessageSquare size={32} className="text-zinc-400" />
        </div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{t('common.ai.debatesPage.detail.notFoundTitle')}</h3>
        <p className="text-zinc-500 max-w-xs mb-6">{t('common.ai.debatesPage.detail.notFoundDesc')}</p>
        <button 
            onClick={() => router.push('/ai-debates')} 
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 active:scale-95 transition-all"
        >
            {t('common.ai.debatesPage.detail.backToList')}
        </button>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-85px)] bg-white dark:bg-zinc-950 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-2xl shadow-indigo-500/5">
      <DebateHeader debate={debate} onBack={() => router.push('/ai-debates')} onScreenshot={() => handleScreenshot('debate-timeline')} onExportPDF={() => handleExportPDFChat(debate)} onDelete={handleDelete} onStop={handleStop} onShare={handleShare} isDeleting={isDeleting} isStopping={isStopping} isSharing={isSharing} />
      
      <div className="flex-1 flex overflow-hidden">
        <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-8 bg-zinc-50/30 dark:bg-zinc-900/10 no-scrollbar">
          <div className="max-w-4xl mx-auto space-y-10" id="debate-timeline">
            <DebateOverviewBar
              debate={debate}
              timeLeft={timeLeft}
              viewMode={effectiveViewMode}
              setViewMode={(m) => setViewMode(m)}
              focusAgent={focusAgent}
              setFocusAgent={setFocusAgent}
              showThinking={showThinking}
              setShowThinking={setShowThinking}
            />

            {effectiveViewMode === 'result' && hasSummary && (
              <div className="pt-2">
                <SummaryMessage
                  msg={summaryMsg || { id: 'summary-report-msg', content: debate.summary, is_summary_report: true }}
                  debate={debate}
                  onCopy={handleCopy}
                  onExport={() => handleExportPDFMsg(summaryMsg || { id: 'summary-report-msg', content: debate.summary, is_summary_report: true })}
                />

                <div className="flex justify-center">
                  <button
                    onClick={() => setViewMode('timeline')}
                    className="px-5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-sm transition-colors"
                  >
                    {t('common.ai.debatesPage.detail.viewTimeline')}
                  </button>
                </div>
              </div>
            )}

            {effectiveViewMode === 'timeline' && (
              <>
                {summaryMsg && (
                  <SummaryMessage
                    key={summaryMsg.id}
                    msg={summaryMsg}
                    debate={debate}
                    onCopy={handleCopy}
                    onExport={() => handleExportPDFMsg(summaryMsg)}
                  />
                )}

                {filteredMessages.map((msg: any) => {
                  // Special rendering for Orchestration messages
                  if ((msg.agent_role === 'Orchestrator' || msg.agent_role === 'Moderator') && msg.agent_name === 'System') {
                      return <OrchestrationMessage key={msg.id} msg={msg} />;
                  }

                  return (
                    <DebateMessageItem
                      key={msg.id}
                      msg={msg}
                      debate={debate}
                      expandedThinking={expandedThinking}
                      setExpandedThinking={setExpandedThinking}
                      showThinking={showThinking}
                      onCopy={handleCopy}
                      onScreenshot={handleScreenshot}
                      onExportPDF={handleExportPDFMsg}
                    />
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>
        <DebateSidebar debate={debate} timeLeft={timeLeft} />
      </div>

      <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(prev => ({ ...prev, isOpen: false })); }} onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} />
    </div>
  );
}
