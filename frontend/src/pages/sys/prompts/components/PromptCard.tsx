
import React from 'react';
import { 
    Calendar, 
    RefreshCw, 
    ChevronRight
} from 'lucide-react';
import { useI18n } from '../../../../contexts';
import type { ProgrammingPrompt } from '../../../../services/promptService';

interface PromptCardProps {
    prompt: ProgrammingPrompt;
    onClick: () => void;
}

export const PromptCard: React.FC<PromptCardProps> = ({ prompt, onClick }) => {
    const { t } = useI18n();

    const formatDate = (date: string) => {
        return new Date(date).toLocaleString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div 
            onClick={onClick}
            className="group bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-500/50 transition-all cursor-pointer relative overflow-hidden flex flex-col h-full"
        >
            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight size={20} className="text-slate-400" />
            </div>
            
            <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white line-clamp-2 min-h-[3rem]">
                        {prompt.title || prompt.original_content.substring(0, 100)}
                    </h3>
                </div>
                
                <div className="flex flex-wrap gap-1.5">
                    {prompt.prompt_categories && (
                        <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md text-[10px] font-bold uppercase">
                            {prompt.prompt_categories.name}
                        </span>
                    )}
                    {prompt.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md text-[10px] font-bold uppercase">
                            {tag}
                        </span>
                    ))}
                    {prompt.tags.length > 2 && (
                        <span className="text-[10px] text-slate-400">+{prompt.tags.length - 2}</span>
                    )}
                </div>

                <div className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {prompt.original_content}
                </div>
            </div>
            
            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <div className="flex items-center gap-1.5">
                    <Calendar size={12} />
                    <span>{formatDate(prompt.created_at)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <RefreshCw size={12} />
                    <span>{prompt.usage_count || 0} {t('prompts.usageCount')}</span>
                </div>
            </div>
        </div>
    );
};
