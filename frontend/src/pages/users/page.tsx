import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Mail, 
  MapPin, 
  RefreshCw, 
  Edit2, 
  Trash2,
  ShieldCheck,
  UserCheck,
  Settings
} from 'lucide-react';
import { useI18n, usePageHeader } from '../../contexts';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  roles: string[];
  status: string;
  region?: {
    country: string;
    province: string;
    city: string;
  };
  created_at: string;
  wechat_openid?: string;
  wechat_unionid?: string;
}

import { authenticatedFetch } from '../../lib/http';

const UsersPage: React.FC = () => {
  const { t } = useI18n();
  const { setPageHeader } = usePageHeader();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [todayNew, setTodayNew] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
        ...(statusFilter && { status: statusFilter }),
      });

      const res = await authenticatedFetch(`/api/admin/users?${queryParams}`);
      const data = await res.json();
      
      setUsers(data.data || []);
      setTotalUsers(data.total || 0);
      setTodayNew(data.todayNew || 0);
      setTotalPages(Math.ceil((data.total || 0) / 20));
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPageHeader(t('users.title'), t('users.subtitle'));
  }, [setPageHeader, t]);

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, statusFilter]);

  const handleEdit = (user: User) => {
      setSelectedUser(user);
      setShowEditModal(true);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const translateRole = (role: string) => {
    const key = `users.roles.${role}`;
    const translated = t(key);
    return translated === key ? role : translated;
  };

  const translateStatus = (status: string) => {
    const key = `users.status.${status}`;
    const translated = t(key);
    return translated === key ? status : translated;
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-start gap-4">
        
        {/* Stats Cards (Top Right) */}
        <div className="flex gap-4">
            <button 
                onClick={() => navigate('/sys/identity')}
                className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 min-w-[140px] hover:border-indigo-500 transition-colors group text-left"
            >
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                    <Settings size={20} />
                </div>
                <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('users.stats.config')}</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{t('users.stats.identity')}</div>
                </div>
            </button>

            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 min-w-[140px]">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                    <UserCheck size={20} />
                </div>
                <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('users.stats.todayNew')}</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">{todayNew}</div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 min-w-[140px]">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <UserCheck size={20} />
                </div>
                <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('users.stats.totalUsers')}</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">{totalUsers}</div>
                </div>
            </div>
        </div>
      </div>

      {/* Filters & Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 items-center gap-4 w-full">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={t('users.search.placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
          
          <select 
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">{t('common.allRoles')}</option>
            <option value="admin">{t('users.roles.admin')}</option>
            <option value="user">{t('users.roles.user')}</option>
          </select>

          <select 
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">{t('common.allStatus')}</option>
            <option value="active">{t('users.status.active')}</option>
            <option value="inactive">{t('users.status.inactive')}</option>
            <option value="banned">{t('users.status.banned')}</option>
          </select>
          
          <button type="submit" className="hidden" /> 
        </form>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => fetchUsers()}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
            title={t('common.refresh')}
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('users.table.user')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('users.table.role')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('users.table.status')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('users.table.location')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('users.table.joinDate')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">{t('users.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <RefreshCw className="animate-spin mx-auto mb-2" />
                    {t('users.loading')}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    {t('users.empty')}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? (
                            <img src={u.avatar_url} alt={u.full_name} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-medium text-sm">
                            {(u.full_name || u.email || 'U').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white truncate text-sm">{u.full_name || t('users.unnamed')}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                            <Mail size={10} /> {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {u.roles?.map(role => (
                            <span key={role} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                                <ShieldCheck size={10} />
                                {translateRole(role)}
                            </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide
                        ${u.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          u.status === 'banned' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}
                      `}>
                        {translateStatus(u.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">
                        <div className="flex items-center gap-1.5">
                            <MapPin size={14} className="text-slate-400" />
                            <span className="truncate max-w-[150px]">
                                {u.region ? [u.region.city, u.region.country].filter(Boolean).join(', ') : '-'}
                            </span>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm whitespace-nowrap">
                        {formatDate(u.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                            onClick={() => handleEdit(u)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            title={t('common.edit')}
                        >
                            <Edit2 size={16} />
                        </button>
                        <button 
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                            title={t('common.delete')}
                        >
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
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {t('common.showing')} {page} {t('common.of')} {totalPages}
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              {t('common.prev')}
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              {t('common.next')}
            </button>
          </div>
        </div>
      </div>

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 p-6 animate-in zoom-in-95 duration-200">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t('users.edit.title')}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">{t('users.form.name')}</label>
                        <input 
                            type="text" 
                            defaultValue={selectedUser.full_name}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">{t('users.table.role')}</label>
                        <select 
                            defaultValue={selectedUser.roles?.[0] || 'user'}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="admin">{t('users.roles.admin')}</option>
                            <option value="user">{t('users.roles.user')}</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">{t('users.table.status')}</label>
                        <select 
                            defaultValue={selectedUser.status}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="active">{t('users.status.active')}</option>
                            <option value="inactive">{t('users.status.inactive')}</option>
                            <option value="banned">{t('users.status.banned')}</option>
                        </select>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button 
                        onClick={() => setShowEditModal(false)}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                    <button 
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                    >
                        {t('common.save')}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
