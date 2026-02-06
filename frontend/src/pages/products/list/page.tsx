
import React, { useState, useEffect } from 'react';
import { Plus, Search, RefreshCw, Trash2, Edit, X, Filter } from 'lucide-react';
import { useI18n, useToast, usePageHeader } from '../../../contexts';
import { ConfirmModal } from '../../../components/ConfirmModal';
import { supabase } from '../../../lib/supabase';

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
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'x-app-id': 'AdminSys_app'
      };
      const [prodRes, catRes, appRes] = await Promise.all([
        fetch('/api/admin/products', { headers }),
        fetch('/api/admin/product-categories', { headers }),
        fetch('/api/admin/apps', { headers })
      ]);
      
      if (!prodRes.ok) {
        const data = await prodRes.json().catch(() => null);
        throw new Error(data?.error || 'Failed to fetch products');
      }
      if (!catRes.ok) {
        const data = await catRes.json().catch(() => null);
        throw new Error(data?.error || 'Failed to fetch categories');
      }
      if (!appRes.ok) {
        const data = await appRes.json().catch(() => null);
        throw new Error(data?.error || 'Failed to fetch apps');
      }
      
      const prodData = await prodRes.json();
      const catData = await catRes.json();
      const appData = await appRes.json();
      
      setProducts(Array.isArray(prodData) ? prodData : []);
      setCategories(Array.isArray(catData) ? catData : []);
      setApps(Array.isArray(appData) ? appData : []);
    } catch (error) {
      showToast((error as any)?.message || '加载失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPageHeader(t('common.productManagement'), '管理平台商品、服务及定价');
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
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-app-id': 'AdminSys_app'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Operation failed');
      }
      
      showToast(editingProduct ? '更新成功' : '创建成功', 'success');
      setShowModal(false);
      fetchData();
    } catch (error) {
      showToast((error as any)?.message || '操作失败', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/admin/products/${deleteId}`, { 
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-app-id': 'AdminSys_app'
        }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Delete failed');
      }
      showToast('删除成功', 'success');
      setDeleteId(null);
      fetchData();
    } catch (error) {
      showToast((error as any)?.message || '删除失败', 'error');
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
    if (!name) return '未命名';
    if (typeof name === 'string') return name;
    // Prioritize current locale, then default/zh/en
    return name[locale] || name.default || name.zh || name.en || '未命名';
  };

  const filtered = products.filter(p => {
    const name = getProductName(p.name).toLowerCase();
    const matchesSearch = name.includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesApp = !filterAppId || p.app_id === filterAppId;
    return matchesSearch && matchesApp;
  });

  return (
    <div className="space-y-6">
       {/* Header Actions */}
       <div className="flex flex-col md:flex-row md:items-center justify-end gap-4">
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
            type="text" 
            placeholder="搜索商品名称或 SKU..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
        </div>
        <div className="w-48">
            <select
                value={filterAppId}
                onChange={e => setFilterAppId(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <option value="">所有应用</option>
                {apps.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                ))}
            </select>
        </div>
        {/* Placeholder for more filters */}
        <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50">
            <Filter size={18} />
            <span>筛选</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-6 py-4">商品名称</th>
              <th className="px-6 py-4">所属应用</th>
              <th className="px-6 py-4">SKU</th>
              <th className="px-6 py-4">分类</th>
              <th className="px-6 py-4">类型</th>
              <th className="px-6 py-4">价格</th>
              <th className="px-6 py-4">状态</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {isLoading ? (
              <tr><td colSpan={8} className="p-8 text-center text-slate-500">加载中...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-slate-500">暂无数据</td></tr>
            ) : (
              filtered.map(prod => (
                <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{getProductName(prod.name)}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {prod.app ? prod.app.name : (prod.app_id ? <span className="font-mono text-xs text-slate-400">{prod.app_id.slice(0,8)}</span> : '-')}
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-500">{prod.sku}</td>
                  <td className="px-6 py-4">
                      {prod.category ? (
                          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs text-slate-600 dark:text-slate-400">
                              {prod.category.name}
                          </span>
                      ) : '-'}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                      {prod.type === 'subscription' ? '订阅制' : prod.type === 'one_time' ? '一次性' : '按量计费'}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      ¥{prod.price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${prod.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-500'}`}>
                      {prod.status === 'active' ? '上架' : '下架'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(prod)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => setDeleteId(prod.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors">
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{editingProduct ? '编辑商品' : '新建商品'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-5">
              {/* Language Tabs */}
              <div className="flex items-center gap-2 mb-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
                  <button
                      type="button"
                      onClick={() => setActiveLang('zh')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                          activeLang === 'zh' 
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                      }`}
                  >
                      <span className="text-xs">🇨🇳</span> 中文
                  </button>
                  <button
                      type="button"
                      onClick={() => setActiveLang('en')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                          activeLang === 'en' 
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                      }`}
                  >
                      <span className="text-xs">🇺🇸</span> English
                  </button>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        商品名称 ({activeLang === 'zh' ? '中文' : 'English'})
                    </label>
                    <input 
                    required
                    value={formData.name[activeLang]}
                    onChange={e => setFormData({
                        ...formData, 
                        name: { ...formData.name, [activeLang]: e.target.value }
                    })}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder={activeLang === 'zh' ? "请输入商品名称" : "Enter product name"}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">SKU</label>
                    <input 
                    required
                    value={formData.sku}
                    onChange={e => setFormData({...formData, sku: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                    placeholder="PROD-001"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">所属应用</label>
                    <select
                        value={formData.app_id}
                        onChange={e => setFormData({...formData, app_id: e.target.value})}
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                        <option value="">(无 - 全局商品)</option>
                        {apps.map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">分类</label>
                    <select
                        value={formData.category_id}
                        onChange={e => setFormData({...formData, category_id: e.target.value})}
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                        <option value="">选择分类...</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">价格 (CNY)</label>
                    <input 
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">类型</label>
                    <select
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value})}
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                        <option value="one_time">一次性</option>
                        <option value="subscription">订阅制</option>
                        <option value="usage_based">按量计费</option>
                    </select>
                </div>
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        描述 ({activeLang === 'zh' ? '中文' : 'English'})
                    </label>
                    <textarea 
                    value={formData.description[activeLang]}
                    onChange={e => setFormData({
                        ...formData, 
                        description: { ...formData.description, [activeLang]: e.target.value }
                    })}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[100px]"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">库存</label>
                    <input 
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                </div>
                <div className="flex items-center pt-8">
                     <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${formData.status === 'active' ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                             <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${formData.status === 'active' ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                        <input 
                            type="checkbox"
                            checked={formData.status === 'active'}
                            onChange={e => setFormData({...formData, status: e.target.checked ? 'active' : 'inactive'})}
                            className="hidden"
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">上架销售</span>
                    </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-medium">取消</button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all font-medium active:scale-95">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="确认删除"
        message="确定要删除该商品吗？此操作无法撤销。"
        confirmText="确认删除"
        cancelText="取消"
      />
    </div>
  );
}
