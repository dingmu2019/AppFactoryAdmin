
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
            showToast('加载分类失败', 'error');
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
                showToast('更新成功', 'success');
            } else {
                await createPromptCategory(formData);
                showToast('创建成功', 'success');
            }
            setEditingCategory(null);
            setFormData({ name: '', code: '', description: '', sort_order: 0, is_active: true });
            loadCategories();
            onUpdate?.();
        } catch (error) {
            showToast('操作失败', 'error');
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
            showToast('删除成功', 'success');
            setDeleteId(null);
            loadCategories();
            onUpdate?.();
        } catch (error) {
            showToast('删除失败', 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('prompts.categories')}</h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Left: List */}
                    <div className="flex-1 p-6 overflow-y-auto border-r border-slate-100 dark:border-slate-800">
                        <div className="space-y-3">
                            {isLoading ? (
                                <div className="flex justify-center py-10">
                                    <RefreshCw className="animate-spin text-slate-400" size={24} />
                                </div>
                            ) : categories.length === 0 ? (
                                <div className="text-center py-10 text-slate-500">暂无分类</div>
                            ) : (
                                categories.map(cat => (
                                    <div key={cat.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                                        <div>
                                            <div className="font-bold text-slate-900 dark:text-white">{cat.name}</div>
                                            <div className="text-xs text-slate-500 font-mono mt-0.5">{cat.code}</div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleEdit(cat)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors"
                                            >
                                                <X size={16} className="rotate-45" /> {/* Use plus/edit icon instead? */}
                                            </button>
                                            <button 
                                                onClick={() => setDeleteId(cat.id)}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"
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
                    <div className="w-full md:w-80 p-6 bg-slate-50/50 dark:bg-slate-900/50">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <h4 className="font-bold text-slate-900 dark:text-white mb-4">
                                {editingCategory ? '编辑分类' : '新增分类'}
                            </h4>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">名称</label>
                                <input 
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                    placeholder="例如：编程开发"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">编码</label>
                                <input 
                                    required
                                    value={formData.code}
                                    onChange={e => setFormData({...formData, code: e.target.value})}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                                    placeholder="例如：PROGRAMMING"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">排序</label>
                                <input 
                                    type="number"
                                    value={formData.sort_order}
                                    onChange={e => setFormData({...formData, sort_order: parseInt(e.target.value)})}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                />
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <input 
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={e => setFormData({...formData, is_active: e.target.checked})}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="is_active" className="text-sm text-slate-700 dark:text-slate-300">启用</label>
                            </div>
                            <div className="pt-4 flex gap-2">
                                {editingCategory && (
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setEditingCategory(null);
                                            setFormData({ name: '', code: '', description: '', sort_order: 0, is_active: true });
                                        }}
                                        className="flex-1 px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors text-sm font-bold"
                                    >
                                        取消
                                    </button>
                                )}
                                <button 
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/25 text-sm font-bold"
                                >
                                    {isSaving ? '保存中...' : (editingCategory ? '更新' : '添加')}
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
                title="确认删除"
                message="确定要删除该分类吗？关联的提示词将变为未分类。"
                confirmText="删除"
                cancelText="取消"
            />
        </div>
    );
};
