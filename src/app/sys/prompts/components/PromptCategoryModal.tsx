
import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { useI18n, useToast } from '../../../../contexts';
import { 
    fetchPromptCategories, 
    createPromptCategory, 
    updatePromptCategory, 
    deletePromptCategory,
    type PromptCategory 
} from '../../../../services/promptService';
import { ConfirmModal } from '../../../../components/ConfirmModal';

interface PromptCategoryModalProps {
    onClose: () => void;
    onUpdate?: () => void;
}

export const PromptCategoryModal: React.FC<PromptCategoryModalProps> = ({ onClose, onUpdate }) => {
    const { t } = useI18n();
    const { showToast } = useToast();
    const [categories, setCategories] = useState<PromptCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Form State
    const [editingCategory, setEditingCategory] = useState<PromptCategory | null>(null);
    const [formData, setFormData] = useState({ name: '', code: '', description: '', sort_order: 0, is_active: true });
    const [isSaving, setIsSaving] = useState(false);

    // Delete State
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const loadCategories = async () => {
        setIsLoading(true);
        try {
            const data = await fetchPromptCategories();
            setCategories(data);
        } catch (error) {
            showToast(t('common.loadFailed'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingCategory) {
                await updatePromptCategory(editingCategory.id, formData);
                showToast(t('common.updateSuccess'), 'success');
            } else {
                await createPromptCategory(formData);
                showToast(t('common.createSuccess'), 'success');
            }
            setEditingCategory(null);
            setFormData({ name: '', code: '', description: '', sort_order: 0, is_active: true });
            loadCategories();
            onUpdate?.();
        } catch (error) {
            showToast(t('common.opFailed'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (cat: PromptCategory) => {
        setEditingCategory(cat);
        setFormData({
            name: cat.name,
            code: cat.code,
            description: cat.description || '',
            sort_order: cat.sort_order,
            is_active: cat.is_active
        });
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deletePromptCategory(deleteId);
            showToast(t('common.deleteSuccess'), 'success');
            setDeleteId(null);
            loadCategories();
            onUpdate?.();
        } catch (error) {
            showToast(t('common.deleteFailed'), 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col">
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{t('common.prompts.categories')}</h3>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Left: List */}
                    <div className="flex-1 p-6 overflow-y-auto border-r border-zinc-100 dark:border-zinc-800">
                        <div className="space-y-3">
                            {isLoading ? (
                                <div className="flex justify-center py-10">
                                    <RefreshCw className="animate-spin text-zinc-400" size={24} />
                                </div>
                            ) : categories.length === 0 ? (
                                <div className="text-center py-10 text-zinc-500">{t('common.noData')}</div>
                            ) : (
                                categories.map(cat => (
                                    <div key={cat.id} className="flex items-center justify-between p-4 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:border-indigo-500/30 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all group">
                                        <div>
                                            <div className="font-bold text-zinc-900 dark:text-white">{cat.name}</div>
                                            <div className="text-xs text-zinc-500 font-mono mt-0.5">{cat.code}</div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleEdit(cat)}
                                                className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                                title={t('common.edit')}
                                            >
                                                <X size={16} className="rotate-45" /> 
                                            </button>
                                            <button 
                                                onClick={() => setDeleteId(cat.id)}
                                                className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                                title={t('common.delete')}
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right: Form */}
                    <div className="w-full md:w-80 p-6 bg-zinc-50/50 dark:bg-zinc-900/50">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <h4 className="font-bold text-zinc-900 dark:text-white mb-4">
                                {editingCategory ? t('common.prompts.editCategory') : t('common.prompts.addCategory')}
                            </h4>
                            <div>
                                <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5">{t('common.prompts.categoryName')}</label>
                                <input 
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                    placeholder={t('common.prompts.categoryPlaceholder')}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5">{t('common.prompts.categoryCode')}</label>
                                <input 
                                    required
                                    value={formData.code}
                                    onChange={e => setFormData({...formData, code: e.target.value})}
                                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                                    placeholder={t('common.prompts.categoryCodePlaceholder')}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5">{t('common.prompts.categorySort')}</label>
                                <input 
                                    type="number"
                                    value={formData.sort_order}
                                    onChange={e => setFormData({...formData, sort_order: parseInt(e.target.value)})}
                                    className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                />
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <input 
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={e => setFormData({...formData, is_active: e.target.checked})}
                                    className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="is_active" className="text-sm text-zinc-700 dark:text-zinc-300">{t('common.prompts.categoryActive')}</label>
                            </div>
                            <div className="pt-4 flex gap-2">
                                {editingCategory && (
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setEditingCategory(null);
                                            setFormData({ name: '', code: '', description: '', sort_order: 0, is_active: true });
                                        }}
                                        className="flex-1 px-4 py-2 rounded-lg text-zinc-600 hover:bg-zinc-200 transition-colors text-sm font-bold"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                )}
                                <button 
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/25 text-sm font-bold"
                                >
                                    {isSaving ? t('common.saving') : (editingCategory ? t('common.update') : t('common.add'))}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <ConfirmModal 
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={handleDelete}
                title={t('common.confirmDelete')}
                message={t('common.prompts.deleteCategoryConfirm')}
                confirmText={t('common.confirmDelete')}
                cancelText={t('common.cancel')}
            />
        </div>
    );
};
