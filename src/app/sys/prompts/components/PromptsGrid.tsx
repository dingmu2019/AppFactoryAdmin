import React from 'react';
import { Terminal } from 'lucide-react';
import { useI18n } from '../../../../contexts';
import { type ProgrammingPrompt } from '../../../../services/promptService';
import { PromptCard } from './PromptCard';

interface PromptsGridProps {
    loading: boolean;
    prompts: ProgrammingPrompt[];
    total: number;
    page: number;
    totalPages: number;
    setPage: (page: number | ((prev: number) => number)) => void;
    onView: (prompt: ProgrammingPrompt) => void;
    onEdit: (prompt: ProgrammingPrompt) => void;
    onDelete: (prompt: ProgrammingPrompt) => void;
    onCopy: (content: string, id: string) => void;
    onManualAdd: () => void;
    onAIExtract: () => void;
}

/**
 * 提示词页面列表网格组件：包含列表、空状态和分页
 */
export const PromptsGrid: React.FC<PromptsGridProps> = ({
    loading,
    prompts,
    total,
    page,
    totalPages,
    setPage,
    onView,
    onDelete,
    onCopy,
    onManualAdd,
    onAIExtract
}) => {
    const { t } = useI18n();

    if (loading && prompts.length === 0) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-64 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 animate-pulse" />
                ))}
            </div>
        );
    }

    if (prompts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-zinc-900 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 shadow-sm">
                <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                    <Terminal size={40} className="text-zinc-300" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{t('prompts.noData')}</h3>
                <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-center max-w-md">
                    {t('prompts.noDataDesc')}
                </p>
                <div className="flex gap-4">
                    <button 
                        onClick={onManualAdd}
                        className="px-6 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-bold hover:bg-zinc-50 transition-all"
                    >
                        {t('common.prompts.add')}
                    </button>
                    <button 
                        onClick={onAIExtract}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 transition-all"
                    >
                        {t('common.prompts.aiExtract')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {prompts.map((prompt) => (
                    <PromptCard 
                        key={prompt.id} 
                        prompt={prompt} 
                        onClick={() => onView(prompt)}
                        onDelete={() => onDelete(prompt)}
                        onCopy={() => onCopy(prompt.optimized_content || prompt.original_content, prompt.id)}
                    />
                ))}
            </div>

            {/* 分页控制 */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <p className="text-sm text-zinc-500 font-medium">{t('common.prompts.totalRecords', { total })}</p>
                    <div className="flex gap-2">
                        <button 
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="px-4 py-2 text-sm font-bold border border-zinc-200 dark:border-zinc-800 rounded-lg disabled:opacity-50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                        >
                            {t('common.prev')}
                        </button>
                        <div className="flex items-center px-4 text-sm font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                            {page} / {totalPages}
                        </div>
                        <button 
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="px-4 py-2 text-sm font-bold border border-zinc-200 dark:border-zinc-800 rounded-lg disabled:opacity-50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                        >
                            {t('common.next')}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}; 
