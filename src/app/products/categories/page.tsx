
'use client';

import React, { useEffect, useState } from 'react';
import { useI18n, useToast } from '@/contexts';
import { Search, Plus, Filter, MoreHorizontal, FolderTree, Loader2, Edit2, Trash2 } from 'lucide-react';
import { authenticatedFetch } from '@/lib/http';
import { ProductCategoryModal } from './components/ProductCategoryModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { deleteProductCategory, type ProductCategory } from '@/services/productService';

export default function ProductCategoriesPage() {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch('/api/admin/product-categories');
      if (!res.ok) throw new Error(t('common.productCategories.fetchFailed'));
      const data = await res.json();
      if (data.success) {
        setCategories(data.data || []);
      } else {
        setError(data.error || t('common.productCategories.fetchFailed'));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: ProductCategory) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteProductCategory(deleteId);
      showToast(t('common.deleteSuccess'), 'success');
      fetchCategories();
    } catch (err: any) {
      showToast(err.message || t('common.deleteFailed'), 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t('common.categoryManagement')}</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">{t('common.productCategories.subtitle')}</p>
        </div>
        <button 
          onClick={() => {
            setEditingCategory(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          <span>{t('common.productCategories.new')}</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input 
            type="text" 
            placeholder={t('common.productCategories.searchPlaceholder')}
            className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <Filter size={18} />
        </button>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden min-h-[200px]">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="animate-spin text-indigo-500" size={24} />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">{t('common.productCategories.empty')}</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">{t('common.productCategories.table.name')}</th>
                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">{t('common.productCategories.table.code')}</th>
                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">{t('common.productCategories.table.app')}</th>
                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">{t('common.productCategories.table.lastUpdated')}</th>
                <th className="px-6 py-3 text-right font-medium text-zinc-500 dark:text-zinc-400">{t('common.productCategories.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {categories.map(cat => (
                <tr key={cat.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <FolderTree size={18} />
                      </div>
                      <span className="font-medium text-zinc-900 dark:text-white">{cat.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300 font-mono text-xs">{cat.code}</td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">{cat.saas_apps?.name || '-'}</td>
                  <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{formatDate(cat.updated_at || cat.created_at || '')}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEdit(cat)}
                        className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        title={t('common.edit')}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => setDeleteId(cat.id)}
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                        title={t('common.delete')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ProductCategoryModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpdate={fetchCategories}
        category={editingCategory}
      />

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t('common.confirmDelete')}
        message={t('common.productCategories.deleteConfirmMsg') || t('common.confirmDeleteMsg')}
      />
    </div>
  );
}

