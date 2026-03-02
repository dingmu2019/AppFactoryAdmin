import { useMemo } from 'react';
import { Copy, FileText, X } from 'lucide-react';
import { useToast, useI18n } from '../../../../contexts';
import { AgentAvatar } from '../../../../components/AgentAvatar';

interface AgentInfo {
  id: string;
  name: string;
  role: string;
  avatar: string;
  description: string;
  system_prompt: string;
}

interface SystemPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: AgentInfo | null;
}

export const SystemPromptModal = ({ isOpen, onClose, agent }: SystemPromptModalProps) => {
  const { showToast } = useToast();
  const { t } = useI18n();

  const promptText = useMemo(() => {
    if (!agent) return '';
    return (agent.system_prompt || '').trim();
  }, [agent]);

  const handleCopy = async () => {
    if (!promptText) return;
    try {
      await navigator.clipboard.writeText(promptText);
      showToast(t('common.ai.assistant.copyPromptSuccess'), 'success');
    } catch {
      showToast(t('common.ai.assistant.copyPromptFailed'), 'error');
    }
  };

  if (!isOpen || !agent) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-4xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-800">
              <FileText size={18} />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{t('common.ai.assistant.systemPromptTitle')}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{t('common.ai.assistant.systemPromptSubtitle')}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30 p-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <AgentAvatar name={agent.avatar} size={28} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-lg font-bold text-zinc-900 dark:text-white">{agent.name}</div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    {agent.role}
                  </span>
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">
                  {agent.description || t('common.noDescription')}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-mono">
                  ID: {agent.id}
                </div>
              </div>
              <button
                onClick={handleCopy}
                className="shrink-0 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"
              >
                <Copy size={16} />
                {t('common.copy')}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="text-sm font-bold text-zinc-900 dark:text-white">System Prompt</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">{promptText.length} chars</div>
            </div>
            <pre className="p-4 text-sm whitespace-pre-wrap font-mono text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-950/40">
              {promptText || t('common.noContent')}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

