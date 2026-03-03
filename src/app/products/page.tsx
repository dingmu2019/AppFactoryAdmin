
'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, RefreshCw, Trash2, Edit, X, Filter, Package, CheckCircle } from 'lucide-react';
import { useI18n, useToast, usePageHeader } from '@/contexts';
import { ConfirmModal } from '@/components/ConfirmModal';
import { supabase } from '@/lib/supabase';
import { authenticatedFetch } from '@/lib/http';

// Types
interface LocalizedText {
  [key: string]: string;
}

interface Product {
  id: string;
  sku: string;
  name: LocalizedText | string; // JSONB
  type: string;
  price: number;
  category_id: string;
  category?: { name: string };
  app_id?: string;
  app?: { name: string };
  description: LocalizedText | string;
  status: string;
  stock: number;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
}

interface App {
  id: string;
  name: string;
}

export default function ProductListPage() {
  const { t, locale } = useI18n();
  const { showToast } = useToast();
  const { setPageHeader } = usePageHeader();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAppId, setFilterAppId] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeLang, setActiveLang] = useState<'zh' | 'en'>('zh'); // UI editing language
  const [formData, setFormData] = useState({
    sku: '',
    name: { zh: '', en: '' } as LocalizedText,
    type: 'one_time',
    price: 0,
    category_id: '',
    app_id: '',
    description: { zh: '', en: '' } as LocalizedText,
    status: 'active',
    stock: 0
  });

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [prodRes, catRes, appRes] = await Promise.all([
        authenticatedFetch('/api/admin/products'),
        authenticatedFetch('/api/admin/product-categories'),
        authenticatedFetch('/api/admin/apps')
      ]);
      
      const parseRes = async (res: Response) => {
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch (e) {
          throw new Error(`Server Error (${res.status}): ${text.slice(0, 100)}...`);
        }
      };

      if (!prodRes.ok) {
        const data = await parseRes(prodRes).catch(e => ({ error: e.message }));
        setError(data);
        throw new Error(data?.error || t('common.loadFailed'));
      }
      if (!catRes.ok) {
        const data = await parseRes(catRes).catch(e => ({ error: e.message }));
        setError(data);
        throw new Error(data?.error || t('common.loadFailed'));
      }
      if (!appRes.ok) {
        const data = await parseRes(appRes).catch(e => ({ error: e.message }));
        setError(data);
        throw new Error(data?.error || t('common.loadFailed'));
      }
      
      const prodData = await prodRes.json().catch(() => parseRes(prodRes));
      const catData = await catRes.json().catch(() => parseRes(catRes));
      const appData = await appRes.json().catch(() => parseRes(appRes));
      
      setProducts(Array.isArray(prodData) ? prodData : (Array.isArray(prodData?.data) ? prodData.data : []));
      setCategories(Array.isArray(catData) ? catData : (Array.isArray(catData?.data) ? catData.data : []));
      setApps(Array.isArray(appData) ? appData : (Array.isArray(appData?.data) ? appData.data : []));
    } catch (error) {
      showToast((error as any)?.message || t('common.loadFailed'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPageHeader(t('common.productManagement'), t('products.subtitle'));
  }, [setPageHeader, t]);

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingProduct 
        ? `/api/admin/products/${editingProduct.id}`
        : '/api/admin/products';
      const method = editingProduct ? 'PUT' : 'POST';
      
      const payload = {
        ...formData
      };

      const res = await authenticatedFetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'x-app-id': 'AdminSys_app'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || t('common.opFailed'));
      }
      
      showToast(editingProduct ? t('common.updateSuccess') : t('common.createSuccess'), 'success');
      setShowModal(false);
      fetchData();
    } catch (error) {
      showToast((error as any)?.message || t('common.opFailed'), 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await authenticatedFetch(`/api/admin/products/${deleteId}`, { 
        method: 'DELETE',
        headers: {
          'x-app-id': 'AdminSys_app'
        }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || t('common.deleteFailed'));
      }
      showToast(t('common.deleteSuccess'), 'success');
      setDeleteId(null);
      fetchData();
    } catch (error) {
      showToast((error as any)?.message || t('common.deleteFailed'), 'error');
    }
  };

  // Helper to safely parse localized text
  const parseLocalized = (val: any): LocalizedText => {
    if (!val) return { zh: '', en: '' };
    if (typeof val === 'string') return { zh: val, en: val }; // Fallback for legacy string data
    return {
      zh: val.zh || val.default || '',
      en: val.en || val.default || ''
    };
  };

  const openEdit = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      sku: prod.sku,
      name: parseLocalized(prod.name),
      type: prod.type,
      price: prod.price,
      category_id: prod.category_id || '',
      app_id: prod.app_id || '',
      description: parseLocalized(prod.description),
      status: prod.status || 'active',
      stock: prod.stock || 0
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingProduct(null);
    setFormData({
      sku: '',
      name: { zh: '', en: '' },
      type: 'one_time',
      price: 0,
      category_id: '',
      app_id: '',
      description: { zh: '', en: '' },
      status: 'active',
      stock: 0
    });
    setShowModal(true);
  };

  // Helper to get name display
  const getProductName = (name: any) => {
    if (!name) return t('common.unnamed');
    if (typeof name === 'string') return name;
    // Prioritize current locale, then default/zh/en
    return name[locale] || name.default || name.zh || name.en || t('common.unnamed');
  };

  const filtered = products.filter(p => {
    const name = getProductName(p.name).toLowerCase();
    const matchesSearch = name.includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesApp = !filterAppId || p.app_id === filterAppId;
    return matchesSearch && matchesApp;
  });

  const activeProductsCount = products.filter(p => p.status === 'active').length;

  return (
    <div className="space-y-6 p-6">
      {/* 顶部指标卡与操作按钮 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Stats Cards */}
        <div className="flex gap-4">
            <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 min-w-[140px]">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <Package size={20} />
                </div>
                <div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t('products.stats.total')}</div>
                    <div className="text-lg font-bold text-zinc-900 dark:text-white">{products.length}</div>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 min-w-[140px]">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                    <CheckCircle size={20} />
                </div>
                <div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t('products.stats.active')}</div>
                    <div className="text-lg font-bold text-zinc-900 dark:text-white">{activeProductsCount}</div>
                </div>
            </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors">
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30">
            <Plus size={20} />
            {t('products.newProduct')}
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
            type="text" 
            placeholder={t('products.filter.searchPlaceholder')} 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
        </div>
        <div className="w-48">
            <select
                value={filterAppId}
                onChange={e => setFilterAppId(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <option value="">{t('products.filter.allApps')}</option>
                {apps.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                ))}
            </select>
        </div>
        {/* Placeholder for more filters */}
        <button
            onClick={() => showToast(t('common.comingSoon'), 'info')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50"
        >
            <Filter size={18} />
            <span>{t('products.filter.more')}</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-400">
          <div className="flex items-center gap-2 font-bold mb-2">
            <Trash2 size={18} />
            {t('common.error')}
          </div>
          <div className="text-sm space-y-2">
            <p className="font-medium">{error.error || error.message}</p>
            {error.details && <p className="opacity-80">Details: {error.details}</p>}
            {error.hint && <p className="opacity-80">Hint: {error.hint}</p>}
            {error.diagnostics && (
              <div className="mt-4 pt-4 border-t border-rose-200/50 dark:border-rose-800/50">
                <p className="text-xs font-bold uppercase tracking-wider mb-2 opacity-60">System Diagnostics:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px] font-mono">
                  <div>SUPABASE_URL: <span className={error.diagnostics.hasUrl ? 'text-emerald-500' : 'text-rose-500'}>{error.diagnostics.hasUrl ? 'SET' : 'MISSING'}</span></div>
                  <div>ANON_KEY: <span className={error.diagnostics.hasAnonKey ? 'text-emerald-500' : 'text-rose-500'}>{error.diagnostics.hasAnonKey ? 'SET' : 'MISSING'}</span></div>
                  <div>SERVICE_KEY: <span className={error.diagnostics.hasServiceRoleKey ? 'text-emerald-500' : 'text-rose-500'}>{error.diagnostics.hasServiceRoleKey ? 'SET' : 'MISSING'}</span></div>
                  <div>ENV: {error.diagnostics.nodeEnv} ({error.diagnostics.vercelEnv})</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 font-medium border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="px-6 py-4">{t('products.table.name')}</th>
              <th className="px-6 py-4">{t('products.table.app')}</th>
              <th className="px-6 py-4">{t('products.table.sku')}</th>
              <th className="px-6 py-4">{t('products.table.category')}</th>
              <th className="px-6 py-4">{t('products.table.type')}</th>
              <th className="px-6 py-4">{t('products.table.price')}</th>
              <th className="px-6 py-4">{t('products.table.status')}</th>
              <th className="px-6 py-4 text-right">{t('products.table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {isLoading ? (
              <tr><td colSpan={8} className="p-8 text-center text-zinc-500">{t('common.loading')}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-zinc-500">{t('common.noData')}</td></tr>
            ) : (
              filtered.map(prod => (
                <tr key={prod.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">{getProductName(prod.name)}</td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                      {prod.app?.name || prod.saas_apps?.name || (prod.app_id ? <span className="font-mono text-xs text-zinc-400">{prod.app_id.slice(0,8)}</span> : '-')}
                  </td>
                  <td className="px-6 py-4 font-mono text-zinc-500">{prod.sku}</td>
                  <td className="px-6 py-4">
                      {(prod.category || prod.product_categories) ? (
                          <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs text-zinc-600 dark:text-zinc-400">
                              {(prod.category || prod.product_categories).name}
                          </span>
                      ) : '-'}
                  </td>
                  <td className="px-6 py-4 text-zinc-500">
                      {prod.type === 'subscription' ? t('products.types.subscription') : prod.type === 'one_time' ? t('products.types.one_time') : t('products.types.usage_based')}
                  </td>
                  <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">
                      ¥{prod.price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${prod.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-zinc-100 text-zinc-500'}`}>
                      {prod.status === 'active' ? t('common.active') : t('common.inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(prod)} className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => setDeleteId(prod.id)} className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{editingProduct ? t('products.modal.edit') : t('products.modal.create')}</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-5 flex-1">
              {/* Language Tabs */}
              <div className="flex items-center gap-2 mb-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg w-fit">
                  <button
                      type="button"
                      onClick={() => setActiveLang('zh')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                          activeLang === 'zh' 
                          ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' 
                          : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
                      }`}
                  >
                      <span className="text-xs">🇨🇳</span> {t('products.form.lang.zh')}
                  </button>
                  <button
                      type="button"
                      onClick={() => setActiveLang('en')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                          activeLang === 'en' 
                          ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' 
                          : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
                      }`}
                  >
                      <span className="text-xs">🇺🇸</span> {t('products.form.lang.en')}
                  </button>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                        {t('products.form.productName')} ({activeLang === 'zh' ? t('products.form.lang.zh') : t('products.form.lang.en')})
                    </label>
                    <input 
                    required
                    value={formData.name[activeLang]}
                    onChange={e => setFormData({
                        ...formData, 
                        name: { ...formData.name, [activeLang]: e.target.value }
                    })}
                    className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder={t('products.form.productNamePlaceholder')}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">{t('products.table.sku')}</label>
                    <input 
                    required
                    value={formData.sku}
                    onChange={e => setFormData({...formData, sku: e.target.value})}
                    className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                    placeholder="PROD-001"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">{t('products.table.app')}</label>
                    <select
                        value={formData.app_id}
                        onChange={e => setFormData({...formData, app_id: e.target.value})}
                        className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                        <option value="">{t('products.modal.globalProduct')}</option>
                        {apps.map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">{t('products.table.category')}</label>
                    <select
                        value={formData.category_id}
                        onChange={e => setFormData({...formData, category_id: e.target.value})}
                        className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                        <option value="">{t('products.modal.selectCategory')}</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">{t('products.table.price')} (CNY)</label>
                    <input 
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">{t('products.table.type')}</label>
                    <select
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value})}
                        className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                        <option value="one_time">{t('products.types.one_time')}</option>
                        <option value="subscription">{t('products.types.subscription')}</option>
                        <option value="usage_based">{t('products.types.usage_based')}</option>
                    </select>
                </div>
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                        {t('products.form.productDesc')} ({activeLang === 'zh' ? t('products.form.lang.zh') : t('products.form.lang.en')})
                    </label>
                    <textarea 
                    value={formData.description[activeLang]}
                    onChange={e => setFormData({
                        ...formData, 
                        description: { ...formData.description, [activeLang]: e.target.value }
                    })}
                    className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[100px]"
                    placeholder={t('products.form.productDescPlaceholder')}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">{t('products.modal.stock')}</label>
                    <input 
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                </div>
                <div className="flex items-center pt-8">
                     <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${formData.status === 'active' ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
                             <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${formData.status === 'active' ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                        <input 
                            type="checkbox"
                            checked={formData.status === 'active'}
                            onChange={e => setFormData({...formData, status: e.target.checked ? 'active' : 'inactive'})}
                            className="hidden"
                        />
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-indigo-600 transition-colors">{t('products.modal.listing')}</span>
                    </label>
                </div>
              </div>
              </div>
              <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3 bg-zinc-50/50 dark:bg-zinc-900/50">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors font-medium">{t('common.cancel')}</button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all font-medium active:scale-95">{t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t('common.confirmDelete')}
        message={t('common.confirmDeleteMsg')}
        confirmText={t('common.confirmDelete')}
        cancelText={t('common.cancel')}
      />
    </div>
  );
}
