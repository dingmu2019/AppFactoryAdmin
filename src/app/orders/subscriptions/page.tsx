
'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Search, Calendar, Users, Clock, Filter } from 'lucide-react';
import { authenticatedFetch } from '@/lib/http';
import { useToast, usePageHeader, useI18n } from '@/contexts';
import { fetchApps } from '@/services/appService';

export default function SubscriptionsPage() {
  const { showToast } = useToast();
  const { setPageHeader } = usePageHeader();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    todayNew: 0,
    last7DaysNew: 0,
    last7DaysExpiring: 0
  });
  const [apps, setApps] = useState<any[]>([]);
  const [appFilter, setAppFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setPageHeader(t('commerce.subscriptions.title'), t('commerce.subscriptions.subtitle'));
  }, [setPageHeader, t]);

  const loadStats = async () => {
    try {
      const res = await authenticatedFetch('/api/admin/subscriptions/stats');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats(data.data);
        }
      }
    } catch {}
  };

  const loadApps = async () => {
    try {
      const data = await fetchApps();
      setApps(data || []);
    } catch {}
  };

  const statusBadge = (status: string) => {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide';
    const s = (status || '').toLowerCase();
    if (s === 'active') return `${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400`;
    if (s === 'trialing') return `${base} bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400`;
    if (s === 'past_due') return `${base} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400`;
    if (s === 'canceled') return `${base} bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400`;
    return `${base} bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300`;
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const fetchSubs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
        ...(appFilter && { appId: appFilter }),
        ...(searchQuery && { search: searchQuery })
      });
      const res = await authenticatedFetch(`/api/admin/subscriptions?${params}`);
      if (!res.ok) {
        showToast(t('common.loadFailed'), 'error');
        return;
      }
      const json = await res.json();
      setSubs(json.data || []);
      setTotalPages(json.totalPages || 1);
    } catch (e: any) {
      showToast(e?.message || t('common.loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApps();
    loadStats();
  }, []);

  useEffect(() => {
    fetchSubs();
  }, [page, appFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSubs();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-start gap-4">
        <div className="flex gap-4">
          <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 min-w-[140px]">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Calendar size={20} />
            </div>
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t('commerce.subscriptions.stats.todayNew')}</div>
              <div className="text-lg font-bold text-zinc-900 dark:text-white">{stats.todayNew}</div>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 min-w-[140px]">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
              <Users size={20} />
            </div>
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t('commerce.subscriptions.stats.last7DaysNew')}</div>
              <div className="text-lg font-bold text-zinc-900 dark:text-white">{stats.last7DaysNew}</div>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 min-w-[140px]">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400">
              <Clock size={20} />
            </div>
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t('commerce.subscriptions.stats.last7DaysExpiring')}</div>
              <div className="text-lg font-bold text-zinc-900 dark:text-white">{stats.last7DaysExpiring}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 items-center gap-4 w-full">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              placeholder={t('commerce.subscriptions.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={18} className="text-zinc-400" />
            <select
              value={appFilter}
              onChange={(e) => { setAppFilter(e.target.value); setPage(1); }}
              className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500 min-w-[160px]"
            >
              <option value="">{t('commerce.source')} ({t('common.all')})</option>
              {apps.map((app: any) => (
                <option key={app.id} value={app.id}>{app.name}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="hidden" />
        </form>

        <button
          className="p-2 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
          onClick={fetchSubs}
          title={t('commerce.subscriptions.refresh')}
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('commerce.customer')}</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('commerce.source')}</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('commerce.subscriptions.plan')}</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('commerce.subscriptions.status')}</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('commerce.subscriptions.periodEnd')}</th>
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('commerce.subscriptions.autoRenew')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td className="px-6 py-12 text-center text-zinc-500" colSpan={6}>
                    <RefreshCw className="animate-spin mx-auto mb-2" />
                    {t('common.loading')}
                  </td>
                </tr>
              ) : subs.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-zinc-500" colSpan={6}>
                    {t('commerce.subscriptions.noSubs')}
                  </td>
                </tr>
              ) : (
                subs.map(s => (
                  <tr key={s.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-zinc-900 dark:text-zinc-100 font-medium">{s.user?.email || '-'}</div>
                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{s.id}</div>
                    </td>
                    <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">{s.saas_apps?.name || '-'}</td>
                    <td className="px-6 py-4 font-mono text-zinc-700 dark:text-zinc-300">{(s.plan_key || '').toUpperCase()}</td>
                    <td className="px-6 py-4">
                      <span className={statusBadge(s.status)}>{(s.status || 'unknown').toUpperCase()}</span>
                    </td>
                    <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">{formatDateTime(s.current_period_end)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${s.cancel_at_period_end ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'}`}>
                        {s.cancel_at_period_end ? t('commerce.subscriptions.autoRenewOff') : t('commerce.subscriptions.autoRenewOn')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {t('common.showing')} {page} {t('common.of')} {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg disabled:opacity-50 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
            >
              {t('common.prev')}
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg disabled:opacity-50 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
            >
              {t('common.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
