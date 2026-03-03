
import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useI18n, useToast } from '@/contexts';
import { authenticatedFetch } from '@/lib/http';
import { createProductCategory, updateProductCategory, type ProductCategory } from '@/services/productService';

interface ProductCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  category?: ProductCategory | null;
}

export const ProductCategoryModal: React.FC<ProductCategoryModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  category
}) => {
  if (!isOpen) return null;

  const { t } = useI18n();
  const { showToast } = useToast();
  const [apps, setApps] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    app_id: '',
    sort_order: 0
  });

  useEffect(() => {
    fetchApps();
  }, []);

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        code: category.code || '',
        description: category.description || '',
        app_id: category.app_id || '',
        sort_order: category.sort_order || 0
      });
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        app_id: '',
        sort_order: 0
      });
    }
  }, [category]);

  const fetchApps = async () => {
    try {
      setLoadingApps(true);
      const res = await authenticatedFetch('/api/admin/apps');
      if (res.ok) {
        const data = await res.json();
        setApps(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch apps:', err);
    } finally {
      setLoadingApps(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // 提交前清理数据：将空字符串转换为 null，避免外键约束失败
      const payload = {
        ...formData,
        app_id: formData.app_id || null,
        parent_id: (formData as any).parent_id || null,
        description: formData.description || null
      };

      if (category) {
        await updateProductCategory(category.id, payload);
        showToast(t('common.updateSuccess'), 'success');
      } else {
        await createProductCategory(payload);
        showToast(t('common.createSuccess'), 'success');
      }
      onUpdate();
      onClose();
    } catch (error: any) {
      showToast(error.message || t('common.opFailed'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col animate-in zoom-in-95 duration-300"
      >
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
            {category ? t('common.edit') : t('common.productCategories.new')}
          </h3>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1">
              {t('common.productCategories.table.name')}
            </label>
            <input 
              required
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder={t('common.productCategories.table.name')}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1">
              {t('common.productCategories.table.code')}
            </label>
            <input 
              required
              type="text"
              value={formData.code}
              onChange={e => setFormData({ ...formData, code: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
              placeholder="e.g. ELECTRONICS"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1">
              {t('common.productCategories.table.app')}
            </label>
            <select
              value={formData.app_id}
              onChange={e => setFormData({ ...formData, app_id: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            >
              <option value="">{t('common.allApps')}</option>
              {apps.map(app => (
                <option key={app.id} value={app.id}>{app.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1">
              {t('common.usageCount')}
            </label>
            <input 
              type="number"
              value={formData.sort_order}
              onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium"
            >
              {t('common.cancel')}
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20 font-medium flex items-center justify-center gap-2"
            >
              {isSaving && <Loader2 size={18} className="animate-spin" />}
              {category ? t('common.save') : t('common.add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
