
import React, { useState, useEffect } from 'react';
import { Plus, Search, RefreshCw, Trash2, Edit, X } from 'lucide-react';
import { useI18n, useToast, usePageHeader } from '../../../contexts';
import { ConfirmModal } from '../../../components/ConfirmModal';
import { supabase } from '../../../lib/supabase';

interface Category {
  id: string;
  name: string;
  code: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export default function ProductCategoriesPage() {
  const { t } = useI18n();
  const { showToast } = useToast();
  const { setPageHeader } = usePageHeader();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', description: '', sort_order: 0, is_active: true });

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/admin/product-categories', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to fetch');
      }
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast((error as any)?.message || '加载失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPageHeader(t('common.categoryManagement'), '管理商品分类体系');
  }, [setPageHeader, t]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCategory 
        ? `/api/admin/product-categories/${editingCategory.id}`
        : '/api/admin/product-categories';
      const method = editingCategory ? 'PUT' : 'POST';
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Operation failed');
      }
      
      showToast(editingCategory ? '更新成功' : '创建成功', 'success');
      setShowModal(false);
      fetchCategories();
    } catch (error) {
      showToast((error as any)?.message || '操作失败', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/admin/product-categories/${deleteId}`, { 
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Delete failed');
      }
      showToast('删除成功', 'success');
      setDeleteId(null);
      fetchCategories();
    } catch (error) {
      showToast((error as any)?.message || '删除失败', 'error');
    }
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      code: cat.code,
      description: cat.description || '',
      sort_order: cat.sort_order,
      is_active: cat.is_active
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingCategory(null);
    setFormData({ name: '', code: '', description: '', sort_order: 0, is_active: true });
    setShowModal(true);
  };

  const filtered = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-4">
        <div className="flex gap-2">
          <button onClick={fetchCategories} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30">
            <Plus size={20} />
            {t('products.newCategory')}
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="搜索分类名称或编码..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-6 py-4">分类名称</th>
              <th className="px-6 py-4">编码</th>
              <th className="px-6 py-4">排序</th>
              <th className="px-6 py-4">状态</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {isLoading ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">加载中...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">暂无数据</td></tr>
            ) : (
              filtered.map(cat => (
                <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{cat.name}</td>
                  <td className="px-6 py-4 font-mono text-slate-500">{cat.code}</td>
                  <td className="px-6 py-4 text-slate-500">{cat.sort_order}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${cat.is_active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-500'}`}>
                      {cat.is_active ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(cat)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => setDeleteId(cat.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors">
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{editingCategory ? '编辑分类' : '新建分类'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">分类名称</label>
                <input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="例如：订阅服务"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">分类编码</label>
                <input 
                  required
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                  placeholder="例如：SUBSCRIPTION"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">描述</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[100px]"
                  placeholder="请输入分类描述..."
                />
              </div>
              <div className="flex gap-6">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">排序</label>
                    <input 
                      type="number"
                      value={formData.sort_order}
                      onChange={e => setFormData({...formData, sort_order: parseInt(e.target.value)})}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                </div>
                <div className="flex items-center pt-8">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${formData.is_active ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                             <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${formData.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                        <input 
                            type="checkbox"
                            checked={formData.is_active}
                            onChange={e => setFormData({...formData, is_active: e.target.checked})}
                            className="hidden"
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">启用状态</span>
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
        message="确定要删除该分类吗？此操作无法撤销。"
        confirmText="确认删除"
        cancelText="取消"
      />
    </div>
  );
}
