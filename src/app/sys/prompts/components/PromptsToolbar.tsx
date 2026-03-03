import React from 'react';
import { Search, X, Calendar } from 'lucide-react';
import { useI18n } from '../../../../contexts';
import { type PromptCategory } from '../../../../services/promptService';

interface PromptsToolbarProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    showFilters: boolean;
    setShowFilters: (show: boolean) => void;
    categoryId: string;
    setCategoryId: (id: string) => void;
    startDate: string;
    setStartDate: (date: string) => void;
    endDate: string;
    setEndDate: (date: string) => void;
    categories: PromptCategory[];
    onSearch: (e: React.FormEvent) => void;
    onResetFilters: () => void;
}

/**
 * 提示词页面工具栏组件：优化后的紧凑布局
 */
export const PromptsToolbar: React.FC<PromptsToolbarProps> = ({
    searchQuery,
    setSearchQuery,
    showFilters,
    setShowFilters,
    categoryId,
    setCategoryId,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    categories,
    onSearch,
    onResetFilters
}) => {
    const { t } = useI18n();

    const hasActiveFilters = categoryId || startDate || endDate;

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                {/* 搜索框 */}
                <form onSubmit={onSearch} className="relative flex-1 min-w-[240px] max-w-lg">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    <input 
                        type="text" 
                        placeholder={t('prompts.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm text-sm"
                    />
                </form>

                {/* 筛选工具组 */}
                <div className="flex items-center gap-2">
                    {/* 分类选择 */}
                    <div className="flex items-center">
                        <select 
                            value={categoryId}
                            onChange={e => setCategoryId(e.target.value)}
                            className="h-10 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm min-w-[140px] shadow-sm cursor-pointer"
                        >
                            <option value="">{t('prompts.category')}: {t('common.all')}</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* 日期筛选切换按钮 */}
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`h-10 flex items-center gap-2 px-4 rounded-lg border text-sm font-medium transition-all shadow-sm ${
                            showFilters || startDate || endDate 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400' 
                            : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800'
                        }`}
                    >
                        <Calendar size={16} />
                        <span>{t('common.filter')}</span>
                        {(startDate || endDate) && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                    </button>

                    {/* 重置按钮 - 仅在有筛选时显示 */}
                    {hasActiveFilters && (
                        <button 
                            onClick={onResetFilters}
                            className="h-10 px-3 flex items-center gap-1.5 text-sm text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors"
                            title={t('common.reset')}
                        >
                            <X size={16} />
                            <span className="hidden sm:inline">{t('common.reset')}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 紧凑型日期筛选面板 */}
            {showFilters && (
                <div className="flex flex-wrap items-center gap-4 p-3 bg-zinc-50/50 dark:bg-zinc-800/30 rounded-lg border border-zinc-200 dark:border-zinc-800 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{t('prompts.startTime')}</span>
                        <input 
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="h-8 px-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs shadow-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{t('prompts.endTime')}</span>
                        <input 
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="h-8 px-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs shadow-sm"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}; 
