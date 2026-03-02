
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Download, 
  RefreshCw, 
  Eye, 
  CheckCircle2, 
  XCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { useI18n, usePageHeader } from '@/contexts';
import { supabase } from '@/lib/supabase';
import { authenticatedFetch } from '@/lib/http';

interface AuditLog {
  id: string;
  user_id?: string | null;
  user_email?: string | null;
  app_id?: string;
  action: string;
  resource: string;
  details: any;
  ip_address: string;
  user_agent: string;
  status: 'SUCCESS' | 'FAILURE';
  created_at: string;
}

interface AuditStats {
  todayCount: number;
  failureCount: number;
}

export default function AuditLogsPage() {
  const { t, locale } = useI18n();
  const { setPageHeader } = usePageHeader();
  
  useEffect(() => {
    setPageHeader(t('common.auditLog'), t('audit.subtitle'));
  }, [setPageHeader, t]);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats>({ todayCount: 0, failureCount: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const handlePrevLog = () => {
    if (selectedIndex > 0) {
      const newIndex = selectedIndex - 1;
      setSelectedIndex(newIndex);
      setSelectedLog(logs[newIndex]);
    }
  };

  const handleNextLog = () => {
    if (selectedIndex < logs.length - 1) {
      const newIndex = selectedIndex + 1;
      setSelectedIndex(newIndex);
      setSelectedLog(logs[newIndex]);
    }
  };

  const openDetail = (log: AuditLog, index: number) => {
    setSelectedLog(log);
    setSelectedIndex(index);
  };

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [appFilter, setAppFilter] = useState('');
  const [searchUserId, setSearchUserId] = useState('');
  const [apps, setApps] = useState<{id: string, name: string}[]>([]);

  const fetchApps = async () => {
    try {
      const res = await authenticatedFetch('/api/admin/apps');
      const data = await res.json();
      if (Array.isArray(data)) {
        setApps(data);
      } else {
        console.error('Apps data is not an array:', data);
        setApps([]);
      }
    } catch (err) {
      console.error('Failed to fetch apps:', err);
      setApps([]);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
        ...(appFilter && { app_id: appFilter }),
        ...(actionFilter && { action: actionFilter }),
        ...(resourceFilter && { resource: resourceFilter }),
        ...(searchUserId && { user_id: searchUserId }),
      });

      const res = await authenticatedFetch(`/api/admin/audit-logs?${queryParams}`);
      const data = await res.json();
      
      setLogs(data.data || []);
      setTotalPages(Math.ceil((data.total || 0) / 20));
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await authenticatedFetch('/api/admin/audit-logs/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [page, actionFilter, resourceFilter, appFilter]); // Reload when filters change

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const getUserLabel = (log: AuditLog & { user?: { email: string } }) => {
    // If backend returns user relation
    if (log.user?.email) return log.user.email;
    
    const email = log.user_email || log.details?.email || log.details?.body?.email;
    if (email) return String(email);
    
    const userId = log.user_id ? String(log.user_id) : '';
    if (userId) return `User ${userId.slice(0, 8)}`;
    return t('audit.anonymous');
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-start gap-4">
        
        {/* Stats Cards (Top Right) */}
        <div className="flex gap-4">
            <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 min-w-[140px]">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <Calendar size={20} />
                </div>
                <div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t('audit.todayStats')}</div>
                    <div className="text-lg font-bold text-zinc-900 dark:text-white">{stats.todayCount}</div>
                </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 min-w-[140px]">
                <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg text-rose-600 dark:text-rose-400">
                    <AlertTriangle size={20} />
                </div>
                <div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t('audit.failedStats')}</div>
                    <div className={`text-lg font-bold ${stats.failureCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{stats.failureCount}</div>
                </div>
            </div>
        </div>
      </div>

      {/* Filters & Toolbar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 items-center gap-4 w-full">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder={t('audit.searchPlaceholder')}
              value={searchUserId}
              onChange={(e) => setSearchUserId(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
          
          <select 
            value={appFilter}
            onChange={(e) => { setAppFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">{t('audit.allApps')}</option>
            {apps.map(app => (
              <option key={app.id} value={app.id}>{app.name}</option>
            ))}
          </select>

          <select 
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">{t('audit.allActions')}</option>
            <option value="POST">{t('audit.actionType.create')}</option>
            <option value="PUT">{t('audit.actionType.update')}</option>
            <option value="DELETE">{t('audit.actionType.delete')}</option>
            <option value="GET">{t('audit.actionType.read')}</option>
            <option value="LOGIN">{t('audit.actionType.login')}</option>
          </select>

          <select 
            value={resourceFilter}
            onChange={(e) => { setResourceFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">{t('audit.allResources')}</option>
            <option value="database">{t('audit.resourceType.database')}</option>
            <option value="users">{t('audit.resourceType.users')}</option>
            <option value="settings">{t('audit.resourceType.settings')}</option>
            <option value="auth">{t('audit.resourceType.auth')}</option>
          </select>
          
          <button type="submit" className="hidden" /> 
        </form>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => fetchLogs()}
            className="p-2 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
            title={t('common.refresh')}
          >
            <RefreshCw size={20} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm shadow-indigo-500/20 transition-all active:scale-95">
            <Download size={18} />
            <span>{t('audit.export')}</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('audit.table.time')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('audit.table.appId')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('audit.table.user')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('audit.table.action')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('audit.table.resource')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('audit.table.status')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 text-right">{t('audit.table.details')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    <RefreshCw className="animate-spin mx-auto mb-2" />
                    {t('audit.loading')}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    {t('audit.empty')}
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-300 font-mono">
                      {log.app_id || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-zinc-900 dark:text-white">
                      <div className="flex flex-col">
                        <span>{getUserLabel(log)}</span>
                        <span className="text-xs text-zinc-400 font-mono">{log.ip_address}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide
                        ${log.action === 'DELETE' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                          log.action === 'POST' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          log.action === 'PUT' || log.action === 'PATCH' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'}
                      `}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-300 font-mono">
                      {log.resource}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {log.status === 'SUCCESS' ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 size={16} />
                          <span>{t('audit.table.success')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                          <XCircle size={16} />
                          <span>{t('audit.table.failed')}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => openDetail(log, index)}
                        className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
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

      {/* Detail Modal */}
      {selectedLog && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedLog(null)}
        >
          <div 
            className="bg-white dark:bg-zinc-900 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-zinc-200 dark:border-zinc-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <FileText className="text-indigo-500" size={20} />
                {t('audit.detail.title')}
              </h3>
              <button 
                onClick={() => setSelectedLog(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Action & Resource Badges */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold uppercase text-zinc-400 mb-1 block">{t('audit.table.action')}</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide
                    ${selectedLog.action === 'DELETE' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                      selectedLog.action === 'POST' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      selectedLog.action === 'PUT' || selectedLog.action === 'PATCH' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'}
                  `}>
                    {selectedLog.action}
                  </span>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold uppercase text-zinc-400 mb-1 block">{t('audit.table.resource')}</label>
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 font-mono border border-zinc-200 dark:border-zinc-700">
                    {selectedLog.resource}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-zinc-400 mb-1 block">{t('audit.detail.requestId')}</label>
                  <p className="font-mono text-sm text-zinc-700 dark:text-zinc-300">{selectedLog.id}</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-zinc-400 mb-1 block">{t('audit.detail.timestamp')}</label>
                  <p className="font-mono text-sm text-zinc-700 dark:text-zinc-300">{formatDate(selectedLog.created_at)}</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-zinc-400 mb-1 block">{t('audit.table.user')}</label>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">{getUserLabel(selectedLog)}</p>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">{selectedLog.user_id || ''}</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-zinc-400 mb-1 block">{t('audit.detail.clientInfo')}</label>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 font-mono">{selectedLog.ip_address}</p>
                  <p className="text-xs text-zinc-400 truncate mt-0.5" title={selectedLog.user_agent}>{selectedLog.user_agent}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-zinc-400 mb-2 block">{t('audit.detail.payload')}</label>
                <div className="bg-zinc-50 dark:bg-zinc-950 rounded-lg p-4 border border-zinc-100 dark:border-zinc-800 overflow-x-auto">
                  <pre className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between">
              <div className="flex gap-2">
                <button
                  onClick={handlePrevLog}
                  disabled={selectedIndex <= 0}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft size={16} />
                  {t('common.prev')}
                </button>
                <button
                  onClick={handleNextLog}
                  disabled={selectedIndex >= logs.length - 1}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {t('common.next')}
                  <ChevronRight size={16} />
                </button>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-indigo-500/20"
              >
                {t('audit.detail.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
