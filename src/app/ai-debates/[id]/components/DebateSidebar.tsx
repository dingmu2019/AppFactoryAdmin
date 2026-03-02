
import React from 'react';
import { CheckCircle } from 'lucide-react';
import { AgentAvatar } from "@/components/AgentAvatar";
import { useI18n } from '@/contexts';

interface DebateSidebarProps {
  debate: any;
  timeLeft: string;
}

export const DebateSidebar: React.FC<DebateSidebarProps> = ({
  debate,
  timeLeft,
}) => {
  const { t } = useI18n();
  return (
    <div className="w-80 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-y-auto">
      <div className="p-6 space-y-8">
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-5 border border-zinc-100 dark:border-zinc-800 text-center text-zinc-400 text-sm">
          {debate.status === 'running' ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="w-8 h-8 border-2 border-zinc-200 border-t-indigo-500 rounded-full animate-spin" />
              <div className="text-center">
                <div className="text-zinc-700 dark:text-zinc-300 font-medium mb-1">{t('common.ai.debatesPage.detail.running')}</div>
                {timeLeft && <div className="text-2xl font-mono font-bold text-indigo-600 dark:text-indigo-400 my-2">{timeLeft}</div>}
                <div className="text-xs text-zinc-400">{t('common.ai.debatesPage.detail.waitSummary')}</div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle size={32} className="text-emerald-500 mb-2" />
              <div className="font-medium text-zinc-900 dark:text-white">{t('common.ai.debatesPage.detail.completed')}</div>
              <div className="text-xs">{t('common.ai.debatesPage.detail.completedDesc')}</div>
            </div>
          )}
        </div>

        <div>
          <h3 className="font-bold text-zinc-900 dark:text-white mb-4 text-sm uppercase tracking-wider text-opacity-70">
            {t('common.ai.debatesPage.detail.participants')} ({debate.participants?.length || 0})
          </h3>
          <div className="space-y-3">
            {debate.participants?.map((p: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                <div className="w-10 h-10 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <AgentAvatar name={p.avatar} size={20} />
                </div>
                <div>
                  <div className="font-medium text-sm text-zinc-900 dark:text-white">{p.name}</div>
                  <div className="text-xs text-zinc-500">{p.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
