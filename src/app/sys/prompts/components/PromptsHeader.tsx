import React from 'react';
import { Zap, RefreshCw, Tag, Plus, Sparkles } from 'lucide-react';
import { useI18n } from '../../../../contexts';

interface PromptsHeaderProps {
    total: number;
    loading: boolean;
    onRefresh: () => void;
    onManageCategories: () => void;
    onManualAdd: () => void;
    onAIExtract: () => void;
}

/**
 * 提示词页面头部组件：显示统计和操作按钮
 */
export const PromptsHeader: React.FC<PromptsHeaderProps> = ({
    total,
    loading,
    onRefresh,
    onManageCategories,
    onManualAdd,
    onAIExtract
}) => {
    const { t } = useI18n();

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* 左侧：统计信息 */}
            <div className="flex items-center">
                <div className="h-10 px-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3">
                    <div className="p-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-md text-indigo-600 dark:text-indigo-400">
                        <Zap size={16} />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">{t('prompts.total')}</span>
                        <span className="text-xl font-bold text-zinc-900 dark:text-white leading-none">{total}</span>
                    </div>
                </div>
            </div>

            {/* 右侧：操作按钮组 */}
            <div className="flex flex-wrap items-center gap-2">
                {/* 刷新按钮 */}
                <button 
                    onClick={onRefresh}
                    className="h-10 w-10 flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-500 hover:text-indigo-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    title={t('common.refresh')}
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>

                {/* 分类管理按钮 */}
                <button 
                    onClick={onManageCategories}
                    className="h-10 px-4 flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium transition-all shadow-sm"
                >
                    <Tag size={18} className="text-indigo-500" />
                    <span>{t('prompts.categories')}</span>
                </button>

                {/* 手动添加按钮 */}
                <button 
                    onClick={onManualAdd}
                    className="h-10 px-4 flex items-center gap-2 bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-sm font-medium transition-all shadow-sm"
                >
                    <Plus size={18} />
                    <span>{t('prompts.manualAdd')}</span>
                </button>

                {/* AI 萃取按钮 */}
                <button 
                    onClick={onAIExtract}
                    className="h-10 px-4 flex items-center gap-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-all shadow-md shadow-indigo-500/20 active:scale-95"
                >
                    <Sparkles size={18} />
                    <span>{t('prompts.aiExtraction')}</span>
                </button>
            </div>
        </div>
    );
}; 
