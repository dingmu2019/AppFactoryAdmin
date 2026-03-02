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
        <div className="flex flex-col md:flex-row md:items-center justify-start gap-4">
            <div className="flex flex-wrap items-center gap-3">
                {/* 统计卡片 */}
                <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 min-w-[140px]">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <Zap size={20} />
                    </div>
                    <div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t('prompts.total')}</div>
                        <div className="text-lg font-bold text-zinc-900 dark:text-white leading-none">{total}</div>
                    </div>
                </div>

                {/* 刷新按钮 */}
                <button 
                    onClick={onRefresh}
                    className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-500 hover:text-indigo-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors h-[52px] w-[52px] flex items-center justify-center"
                    title={t('common.refresh')}
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>

                {/* 分类管理按钮 */}
                <button 
                    onClick={onManageCategories}
                    className="flex items-center gap-2 px-5 h-[52px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium transition-all shadow-sm"
                >
                    <Tag size={20} className="text-indigo-500" />
                    {t('common.prompts.categories')}
                </button>

                {/* 手动添加按钮 */}
                <button 
                    onClick={onManualAdd}
                    className="flex items-center gap-2 px-5 h-[52px] bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 font-medium transition-all shadow-sm"
                >
                    <Plus size={20} />
                    {t('common.prompts.add')}
                </button>

                {/* AI 萃取按钮 */}
                <button 
                    onClick={onAIExtract}
                    className="flex items-center gap-2 px-5 h-[52px] bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-all shadow-lg shadow-indigo-500/30 active:scale-95"
                >
                    <Sparkles size={20} />
                    {t('common.prompts.aiExtract')}
                </button>
            </div>
        </div>
    );
}; 
