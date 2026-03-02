import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { useI18n } from '../../../../contexts';
import { type PromptCategory } from '../../../../services/promptService';

interface AIExtractionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    content: string;
    setContent: (content: string) => void;
    categoryId: string;
    setCategoryId: (id: string) => void;
    categories: PromptCategory[];
    isCreating: boolean;
}

/**
 * AI 萃取提示词弹窗组件
 */
export const AIExtractionModal: React.FC<AIExtractionModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    content,
    setContent,
    categoryId,
    setCategoryId,
    categories,
    isCreating
}) => {
    const { t } = useI18n();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{t('common.prompts.aiModal.title')}</h3>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">{t('common.prompts.aiModal.input')}</label>
                        <textarea 
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none h-40 font-mono text-sm resize-none"
                            placeholder={t('common.prompts.aiModal.inputPlaceholder')}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">{t('common.prompts.form.category')}</label>
                        <select 
                            value={categoryId}
                            onChange={e => setCategoryId(e.target.value)}
                            className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="">{t('common.prompts.selectCategory')}</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                    <button 
                        onClick={onSubmit}
                        disabled={isCreating || !content.trim()}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 transition-all"
                    >
                        {isCreating ? <span className="animate-spin">⏳</span> : <Sparkles size={16} />}
                        {t('common.prompts.aiModal.submit')}
                    </button>
                </div>
            </div>
        </div>
    );
}; 
