
'use client';

import React, { useState, useEffect } from 'react';
import { Search, Bug, RefreshCw, Eye, XCircle, CheckCircle2, Calendar, AlertTriangle, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n, usePageHeader } from '@/contexts';
import { supabase } from '@/lib/supabase';
import { authenticatedFetch } from '@/lib/http';

interface SystemLog {
  id: string;
  level: 'ERROR' | 'WARN' | 'FATAL';
  message: string;
  stack_trace?: string;
  context?: any;
  app_id?: string;
  user_id?: string;
  ip_address?: string;
  path?: string;
  method?: string;
  resolved: boolean;
  created_at: string;
}

interface LogStats {
  today_count: number;
  unresolved_count: number;
  fatal_count: number;
}

const SysLogsPage: React.FC = () => {
  const { t, locale } = useI18n();
  const { setPageHeader } = usePageHeader();
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageHeader(t('systemLogs.title'), t('systemLogs.subtitle'));
  }, [setPageHeader, t]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [stats, setStats] = useState<LogStats>({ today_count: 0, unresolved_count: 0, fatal_count: 0 });

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

  // Filters
  const [levelFilter, setLevelFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [appFilter, setAppFilter] = useState('');
  const [apps, setApps] = useState<{id: string, name: string}[]>([]);

  const fetchApps = async () => {
    try {
      const res = await authenticatedFetch('/api/admin/apps');
      if (res.ok) {
        const data = await res.json();
        setApps(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch apps:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await authenticatedFetch('/api/admin/system-logs/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
        ...(levelFilter && { level: levelFilter }),
        ...(appFilter && { app_id: appFilter }),
        ...(searchQuery && { search: searchQuery }),
      });

      const res = await authenticatedFetch(`/api/admin/system-logs?${queryParams}`);
      if (!res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") === -1) {
            throw new TypeError("Received non-JSON response from server");
        }
        throw new Error(`Server error: ${res.status}`);
      }
      const data = await res.json();
      
      setLogs(data.data || []);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      console.error('Failed to fetch logs:', err);
      if (err.name === 'TypeError' && err.message.includes('non-JSON')) {
          console.warn('Backend API might be down or path is incorrect');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (log: SystemLog) => {
    try {
      const res = await authenticatedFetch(`/api/admin/system-logs/${log.id}/resolve`, {
          method: 'PATCH',
          body: JSON.stringify({ resolved: !log.resolved })
      });
      if (res.ok) {
          setLogs(logs.map(l => l.id === log.id ? { ...l, resolved: !l.resolved } : l));
          if (selectedLog && selectedLog.id === log.id) {
              setSelectedLog({ ...selectedLog, resolved: !log.resolved });
          }
          fetchStats(); // Refresh stats
      }
    } catch (err) {
      console.error('Failed to resolve log:', err);
    }
  };

  useEffect(() => {
    fetchApps();
    fetchStats();
    fetchLogs();
  }, [page, levelFilter, appFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-start gap-4">
        
        {/* Stats Cards (Top Right) */}
        <div className="flex gap-4">
            <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 min-w-[140px]">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <Calendar size={20} />
                </div>
                <div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t('systemLogs.stats.today')}</div>
                    <div className="text-lg font-bold text-zinc-900 dark:text-white">{stats.today_count}</div>
                </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 min-w-[140px]">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400">
                    <AlertTriangle size={20} />
                </div>
                <div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t('systemLogs.stats.unresolved')}</div>
                    <div className="text-lg font-bold text-zinc-900 dark:text-white">{stats.unresolved_count}</div>
                </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 min-w-[140px]">
                <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg text-rose-600 dark:text-rose-400">
                    <Activity size={20} />
                </div>
                <div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t('systemLogs.stats.fatal')}</div>
                    <div className="text-lg font-bold text-zinc-900 dark:text-white">{stats.fatal_count}</div>
                </div>
            </div>
        </div>
      </div>

      {/* Filters & Toolbar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 items-center gap-4 w-full">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder={t('systemLogs.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
          
          <select 
            value={appFilter}
            onChange={(e) => { setAppFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">{t('audit.allApps')}</option>
            {Array.isArray(apps) && apps.map(app => (
              <option key={app.id} value={app.id}>{app.name}</option>
            ))}
          </select>

          <select 
            value={levelFilter}
            onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">{t('common.all')}</option>
            <option value="ERROR">ERROR</option>
            <option value="WARN">WARN</option>
            <option value="FATAL">FATAL</option>
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
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('systemLogs.table.time')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('systemLogs.table.level')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('systemLogs.table.app')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('systemLogs.table.message')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('systemLogs.table.path')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('systemLogs.table.resolved')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 text-right">{t('audit.table.details')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    <RefreshCw className="animate-spin mx-auto mb-2" />
                    {t('systemLogs.loading')}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    {t('systemLogs.empty')}
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide
                        ${log.level === 'FATAL' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                          log.level === 'ERROR' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}
                      `}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-300 font-mono">
                      {log.app_id || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-200 font-medium max-w-xs truncate" title={log.message}>
                      {log.message}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400 font-mono">
                      {log.method} {log.path}
                    </td>
                    <td className="px-6 py-4 text-sm">
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleResolve(log); }}
                         className={`flex items-center gap-1.5 transition-colors ${log.resolved ? 'text-emerald-500 hover:text-emerald-600' : 'text-rose-500 hover:text-rose-600'}`}
                         title={log.resolved ? t('systemLogs.table.actions.reopen') : t('systemLogs.table.actions.resolve')}
                       >
                         {log.resolved ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                         <span className="text-xs font-medium">{log.resolved ? t('systemLogs.table.status.resolved') : t('systemLogs.table.status.open')}</span>
                       </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => { setSelectedLog(log); setSelectedIndex(index); }}
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedLog(null)}
        >
          <div 
            className="bg-white dark:bg-zinc-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                    selectedLog.level === 'FATAL' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' :
                    selectedLog.level === 'ERROR' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                }`}>
                    <Bug size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">
                        {t('systemLogs.detail.title')}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">{selectedLog.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      selectedLog.resolved 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' 
                      : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800'
                  }`}>
                      {selectedLog.resolved ? t('systemLogs.table.status.resolved').toUpperCase() : t('systemLogs.table.status.open').toUpperCase()}
                  </span>
                  <button 
                    onClick={() => setSelectedLog(null)}
                    className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <XCircle size={20} />
                  </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Error Message Banner */}
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/50 p-4 rounded-lg flex gap-3 shadow-sm">
                  <div className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400">
                      <AlertTriangle size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-rose-800 dark:text-rose-200 mb-1">{t('systemLogs.detail.message')}</h4>
                      <p className="text-rose-900 dark:text-rose-100 font-medium break-words text-sm leading-relaxed">
                          {selectedLog.message}
                      </p>
                  </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                      <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1 block">{t('systemLogs.detail.timestamp')}</label>
                      <div className="font-mono text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                          <Calendar size={14} className="text-zinc-400" />
                          {formatDate(selectedLog.created_at)}
                      </div>
                  </div>
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                      <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1 block">{t('systemLogs.detail.app')}</label>
                      <div className="text-sm text-zinc-700 dark:text-zinc-300 font-bold">
                          {selectedLog.app_id || t('systemLogs.detail.system')}
                      </div>
                  </div>
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                      <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1 block">{t('systemLogs.detail.path')}</label>
                      <div className="text-sm text-zinc-700 dark:text-zinc-300 font-mono break-all">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-2">{selectedLog.method}</span>
                          {selectedLog.path}
                      </div>
                  </div>
              </div>

              {/* Stack Trace */}
              {selectedLog.stack_trace && (
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                            <Activity size={14} /> {t('systemLogs.detail.stack')}
                        </label>
                        <button 
                            onClick={() => navigator.clipboard.writeText(selectedLog.stack_trace || '')}
                            className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                        >
                            {t('systemLogs.detail.copyTrace')}
                        </button>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800 overflow-x-auto shadow-inner relative group">
                        <pre className="text-xs font-mono text-zinc-700 dark:text-emerald-400 leading-relaxed whitespace-pre-wrap break-all">
                            {selectedLog.stack_trace}
                        </pre>
                    </div>
                </div>
              )}

              {/* Context Data */}
              {selectedLog.context && Object.keys(selectedLog.context).length > 0 && (
                <div>
                  <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-2 block">Context Data</label>
                  <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <pre className="text-xs font-mono text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap break-all">
                      {JSON.stringify(selectedLog.context, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between bg-zinc-50/50 dark:bg-zinc-900">
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

              <div className="flex gap-2">
                  <button 
                 onClick={() => handleResolve(selectedLog)}
                 className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                     selectedLog.resolved 
                     ? 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700' 
                     : 'bg-emerald-600 dark:bg-emerald-500 !text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 border border-emerald-700/20 dark:border-emerald-300/20'
                 }`}
              >
                     {selectedLog.resolved ? (
                         <>{t('systemLogs.table.actions.reopen')}</>
                     ) : (
                         <><CheckCircle2 size={18} /> {t('systemLogs.table.actions.resolve')}</>
                     )}
                  </button>
                  
                  <button 
                    onClick={() => setSelectedLog(null)}
                    className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                  >
                    {t('systemLogs.detail.close')}
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SysLogsPage;
