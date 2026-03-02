
'use client';

import React, { useEffect, useState } from 'react';
import { useI18n } from '@/contexts';
import { Search, Plus, Filter, MoreHorizontal, FolderTree, Loader2 } from 'lucide-react';
import { authenticatedFetch } from '@/lib/http';

export default function ProductCategoriesPage() {
  const { t } = useI18n();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors text-sm font-medium">
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
                <tr key={cat.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
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
                  <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{formatDate(cat.updated_at || cat.created_at)}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                      <MoreHorizontal size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
