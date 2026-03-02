import React from 'react';
import { CheckCircle, Clock, Users, Zap } from 'lucide-react';
import { useI18n } from '@/contexts';

type ViewMode = 'result' | 'timeline';

interface DebateOverviewBarProps {
  debate: any;
  timeLeft: string;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  focusAgent: string;
  setFocusAgent: (value: string) => void;
  showThinking: boolean;
  setShowThinking: (value: boolean) => void;
}

const statusChipStyles: Record<string, string> = {
  running: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  terminated: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300',
  pending: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-200',
  error: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300',
};

export const DebateOverviewBar: React.FC<DebateOverviewBarProps> = ({
  debate,
  timeLeft,
  viewMode,
  setViewMode,
  focusAgent,
  setFocusAgent,
  showThinking,
  setShowThinking,
}) => {
  const { t } = useI18n();
  const isRunning = debate?.status === 'running';
  const statusStyle = statusChipStyles[debate?.status] || statusChipStyles.pending;
  const participants = Array.isArray(debate?.participants) ? debate.participants : [];
  const participantNames = participants.map((p: any) => p?.name).filter(Boolean);
  const messageCount = Array.isArray(debate?.messages) ? debate.messages.length : 0;

  return (
    <div className="sticky top-0 z-20 bg-white/90 dark:bg-zinc-950/85 backdrop-blur border-b border-zinc-200/80 dark:border-zinc-800/80">
      <div className="px-6 py-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
            <span className={`px-2 py-1 rounded-md font-semibold ${statusStyle} inline-flex items-center gap-1`}>
              {debate?.status === 'completed' ? <CheckCircle size={14} /> : <Clock size={14} className={isRunning ? 'animate-pulse' : ''} />}
              <span className="capitalize">{debate?.status}</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1">
              <Users size={14} />
              <span>{participants.length}</span>
            </span>
            <span className="hidden md:inline-flex items-center gap-1">
              <Zap size={14} />
              <span>{messageCount}</span>
            </span>
            {isRunning && (
              <span className="hidden sm:inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-300">
                <Clock size={14} />
                <span>{timeLeft || '—'}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50 dark:bg-zinc-900">
              <button
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === 'result' ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
                onClick={() => setViewMode('result')}
              >
                {t('common.ai.debatesPage.detail.summary')}
              </button>
              <button
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === 'timeline' ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
                onClick={() => setViewMode('timeline')}
              >
                {t('common.ai.debatesPage.detail.timeline')}
              </button>
            </div>

            <div className="hidden sm:inline-flex rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50 dark:bg-zinc-900">
              <button
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${!showThinking ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
                onClick={() => setShowThinking(false)}
              >
                {t('common.ai.debatesPage.detail.simple')}
              </button>
              <button
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${showThinking ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
                onClick={() => setShowThinking(true)}
              >
                {t('common.ai.debatesPage.detail.deep')}
              </button>
            </div>

            <select
              value={focusAgent}
              onChange={(e) => setFocusAgent(e.target.value)}
              className="max-w-[160px] px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-200 outline-none"
            >
              <option value="__all__">{t('common.ai.debatesPage.detail.allAgents')}</option>
              {participantNames.map((n: string) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
              <option value="System">System</option>
            </select>
          </div>
        </div>

        <div className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
          {debate?.topic || ''}
        </div>
      </div>
    </div>
  );
};
