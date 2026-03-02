'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast, useI18n } from '@/contexts';
import { PublicDebateHeader } from './components/PublicDebateHeader';
import { DebateMessageItem } from '@/app/ai-debates/[id]/components/DebateMessageItem';
import { SummaryMessage } from '@/app/ai-debates/[id]/components/SummaryMessage';
import { handleExportPDFChat, handleExportPDFMsg } from '@/app/ai-debates/[id]/utils/exportUtils';

export default function PublicDebatePage({ params }: { params: { token: string } }) {
  const { token } = params;
  const { t } = useI18n();
  const { showToast } = useToast();

  const [debate, setDebate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!token) return;
    const fetchDebate = async () => {
      try {
        const res = await fetch(`/api/public/debates/${token}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || t('share.debate.loadFailed'));
        }
        const data = await res.json();
        setDebate(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDebate();
  }, [token]);

  const handleScreenshot = () => {
    showToast(t('share.debate.screenshotNotAvailable'), 'info');
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (error || !debate) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-lg shadow-xl max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{t('share.debate.accessDeniedTitle')}</h1>
          <p className="text-zinc-500 mb-6">{error || t('share.debate.notFoundOrExpired')}</p>
          <a href="/" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            {t('common.goHome')}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <PublicDebateHeader debate={debate} onExportPDF={() => handleExportPDFChat(debate)} />

      <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="space-y-8">
          {(debate.messages || []).map((msg: any) =>
            msg.is_summary_report ? (
              <SummaryMessage
                key={msg.id}
                msg={msg}
                debate={debate}
                onCopy={(text) => {
                  navigator.clipboard.writeText(text);
                  showToast(t('common.copySuccess'), 'success');
                }}
                onExport={() => handleExportPDFMsg(msg)}
              />
            ) : (
              <DebateMessageItem
                key={msg.id}
                msg={msg}
                debate={debate}
                expandedThinking={expandedThinking}
                setExpandedThinking={setExpandedThinking}
                showThinking={false}
                onCopy={(c) => {
                  navigator.clipboard.writeText(c);
                  showToast(t('common.copySuccess'), 'success');
                }}
                onScreenshot={() => handleScreenshot()}
                onExportPDF={handleExportPDFMsg}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
