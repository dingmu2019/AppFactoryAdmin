import React from 'react';
import { X, Plus, Check } from 'lucide-react';
import { useI18n } from '../../../../contexts';
import { type PromptCategory } from '../../../../services/promptService';

interface PromptFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    isEditing: boolean;
    isCreating: boolean;
    formData: {
        title: string;
        original_content: string;
        optimized_content: string;
        tags: string;
        category_id: string;
    };
    setFormData: (data: any) => void;
    categories: PromptCategory[];
}

/**
 * 手动创建/编辑提示词弹窗组件
 */
export const PromptFormModal: React.FC<PromptFormModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    isEditing,
    isCreating,
    formData,
    setFormData,
    categories
}) => {
    const { t } = useI18n();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                        {isEditing ? t('common.edit') : t('common.prompts.add')}
                    </h3>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={onSubmit}>
                    <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">{t('common.prompts.form.title')}</label>
                            <input 
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                                className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder={t('common.prompts.form.titlePlaceholder')}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">{t('common.prompts.form.category')}</label>
                                <select 
                                    value={formData.category_id}
                                    onChange={e => setFormData({...formData, category_id: e.target.value})}
                                    className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    required
                                >
                                    <option value="">{t('common.prompts.selectCategory')}</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">{t('common.prompts.form.tags')}</label>
                                <input 
                                    type="text"
                                    value={formData.tags}
                                    onChange={e => setFormData({...formData, tags: e.target.value})}
                                    placeholder={t('common.prompts.form.tagsPlaceholder')}
                                    className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">{t('common.prompts.form.original')}</label>
                            <textarea 
                                value={formData.original_content}
                                onChange={e => setFormData({...formData, original_content: e.target.value})}
                                placeholder={t('common.prompts.form.originalPlaceholder')}
                                className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none h-32 font-mono text-sm resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">{t('common.prompts.form.optimized')}</label>
                            <textarea 
                                value={formData.optimized_content}
                                onChange={e => setFormData({...formData, optimized_content: e.target.value})}
                                placeholder={t('common.prompts.form.optimizedPlaceholder')}
                                className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none h-48 font-mono text-sm resize-none"
                                required
                            />
                        </div>
                    </div>

                    <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3 bg-zinc-50/50 dark:bg-zinc-900/50">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button 
                            type="submit"
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all"
                        >
                            {isCreating ? <Plus size={18} /> : <Check size={18} />}
                            {t('common.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}; 
