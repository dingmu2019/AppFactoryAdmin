
import { Zap, Info, Eraser, Minimize2, Maximize2, Sparkles } from 'lucide-react';
import { Tooltip } from '../../../../components/Tooltip';
import { useI18n } from '../../../../contexts';
import type { Agent } from '../types';

interface ChatHeaderProps {
  activeAgent: Agent | null;
  isFullScreen: boolean;
  setIsFullScreen: (full: boolean) => void;
  setIsSkillsModalOpen: (open: boolean) => void;
  setIsSystemPromptModalOpen: (open: boolean) => void;
  onClear: () => void;
  onCrystallize: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  activeAgent,
  isFullScreen,
  setIsFullScreen,
  setIsSkillsModalOpen,
  setIsSystemPromptModalOpen,
  onClear,
  onCrystallize
}) => {
  const { t } = useI18n();

  return (
    <div className="h-20 flex items-center justify-between px-8 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md sticky top-0 z-30 border-b border-zinc-200/30 dark:border-zinc-800/30">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            {activeAgent?.name}
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </h2>
          <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{activeAgent?.role}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 p-1 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200/50 dark:border-zinc-800/50">
        <Tooltip content={t('common.ai.assistant.crystallize')}>
            <button
                className="p-2.5 text-indigo-500 hover:text-white hover:bg-indigo-600 rounded-lg transition-all duration-300 relative group"
                onClick={onCrystallize}
            >
                <Sparkles size={18} strokeWidth={2.5} />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
            </button>
        </Tooltip>

        <div className="w-px h-4 bg-zinc-300/30 dark:bg-zinc-700/30 mx-1" />

        <Tooltip content={t('common.ai.assistant.skills')}>
          <button 
            className="p-2.5 text-zinc-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-zinc-800 rounded-lg transition-all duration-300"
            onClick={() => setIsSkillsModalOpen(true)}
          >
            <Zap size={18} />
          </button>
        </Tooltip>
        
        <Tooltip content={t('common.ai.assistant.systemPrompt')}>
          <button 
            className="p-2.5 text-zinc-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-zinc-800 rounded-lg transition-all duration-300"
            onClick={() => setIsSystemPromptModalOpen(true)}
          >
            <Info size={18} />
          </button>
        </Tooltip>

        <div className="w-px h-4 bg-zinc-300/30 dark:bg-zinc-700/30 mx-1" />
        
        <Tooltip content={t('common.ai.assistant.clear')}>
          <button 
            onClick={onClear}
            className="p-2.5 text-zinc-400 hover:text-rose-500 hover:bg-white dark:hover:bg-zinc-800 rounded-lg transition-all duration-300"
            title={t('common.ai.assistant.clear')}
          >
            <Eraser size={18} />
          </button>
        </Tooltip>

        <Tooltip content={isFullScreen ? t('common.ai.assistant.exitFullScreen') : t('common.ai.assistant.fullScreen')}>
          <button 
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-2.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 rounded-lg transition-all duration-300"
          >
            {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
