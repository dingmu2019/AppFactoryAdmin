import React, { useState, useEffect } from 'react';
import { useI18n, useTheme } from '../../contexts';
import { Search, Filter, AlertCircle, Info, Bug, ChevronLeft, ChevronRight, Download, RefreshCw, X, ArrowUp, ArrowDown } from 'lucide-react';
import { LogLevel } from '../../types';
import { supabase } from '../../lib/supabase';

export const SystemLogsPage: React.FC = () => {
  const { t } = useI18n();
  const { isDark } = useTheme();
  
  // State
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  // Fetch Logs
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('error_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply Filters
      if (levelFilter !== 'all') {
        query = query.eq('level', levelFilter);
      }
      
      if (searchTerm) {
        query = query.or(`message.ilike.%${searchTerm}%, app_id.ilike.%${searchTerm}%`);
      }

      // Pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;

      setLogs(data || []);
      setTotalItems(count || 0);
      
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentPage, itemsPerPage, levelFilter, searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, levelFilter]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertCircle size={14} className="text-rose-500 mr-1" />;
      case 'warn': return <AlertCircle size={14} className="text-amber-500 mr-1" />;
      case 'info': return <Info size={14} className="text-blue-500 mr-1" />;
      case 'debug': return <Bug size={14} className="text-slate-500 mr-1" />;
      default: return <Info size={14} className="text-slate-500 mr-1" />;
    }
  };

  const getLevelBadgeColor = (level: string) => {
     switch(level) {
         case 'error': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
         case 'warn': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
         case 'info': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
         case 'debug': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
         default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
     }
  };

  // Detail Navigation
  const handlePrevLog = () => {
    if (!selectedLog) return;
    const currentIndex = logs.findIndex(l => l.id === selectedLog.id);
    if (currentIndex > 0) {
      setSelectedLog(logs[currentIndex - 1]);
    }
  };

  const handleNextLog = () => {
    if (!selectedLog) return;
    const currentIndex = logs.findIndex(l => l.id === selectedLog.id);
    if (currentIndex < logs.length - 1) {
      setSelectedLog(logs[currentIndex + 1]);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
             {t('common.systemErrorLog')}
           </h2>
           <p className="text-slate-500 dark:text-slate-400 mt-1">Audit trail and system events.</p>
        </div>
        <div className="flex gap-3">
             <button 
                onClick={fetchLogs}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
             >
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors">
                <Download size={16} /> {t('commerce.export')}
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-200">
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
             <div className="flex flex-wrap gap-4 w-full xl:w-auto">
                 {/* Search */}
                 <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder={t('common.filter') + " Message, App ID..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                 </div>
                 
                 {/* Level Filter */}
                 <div className="relative min-w-[160px]">
                    <select 
                        value={levelFilter}
                        onChange={(e) => setLevelFilter(e.target.value as any)}
                        className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                    >
                        <option value="all">All Levels</option>
                        <option value="info">Info</option>
                        <option value="warn">Warning</option>
                        <option value="error">Error</option>
                        <option value="debug">Debug</option>
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <AlertCircle size={16} />
                    </div>
                 </div>
             </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                        <th className="px-6 py-3 font-medium">Timestamp</th>
                        <th className="px-6 py-3 font-medium">Level</th>
                        <th className="px-6 py-3 font-medium">App ID</th>
                        <th className="px-6 py-3 font-medium w-1/3">Message</th>
                        <th className="px-6 py-3 font-medium">Context</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {isLoading ? (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                <div className="flex justify-center">
                                    <RefreshCw className="animate-spin text-indigo-600" size={24} />
                                </div>
                            </td>
                        </tr>
                    ) : logs.map((log) => (
                        <tr 
                            key={log.id} 
                            onClick={() => setSelectedLog(log)}
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                        >
                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono text-xs whitespace-nowrap">
                                {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${getLevelBadgeColor(log.level)}`}>
                                    {getLevelIcon(log.level)}
                                    {log.level}
                                </span>
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {log.app_id || 'System'}
                            </td>
                            <td className="px-6 py-4 text-slate-800 dark:text-slate-200">
                                <div className="max-w-md truncate">
                                    {log.message}
                                </div>
                                {log.stack_trace && (
                                    <div className="mt-1 text-xs text-rose-500 font-mono truncate max-w-xs opacity-80">
                                        Stack Trace Available
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                                <div className="font-mono text-[10px] opacity-75 max-w-[200px] truncate">
                                    {JSON.stringify(log.context)}
                                </div>
                            </td>
                        </tr>
                    ))}
                    {!isLoading && logs.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                <div className="flex flex-col items-center justify-center">
                                    <Search size={32} className="text-slate-300 mb-2" />
                                    <p>No logs found matching your filters.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-400">
             <div className="flex items-center gap-4">
                <span>
                   {t('common.showing')} <span className="font-medium text-slate-900 dark:text-white">{totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> {t('common.to')} <span className="font-medium text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, totalItems)}</span> {t('common.of')} <span className="font-medium text-slate-900 dark:text-white">{totalItems}</span> {t('common.results')}
                </span>
                
                <div className="flex items-center gap-2">
                    <span className="hidden sm:inline">{t('common.rowsPerPage')}:</span>
                    <select 
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
             </div>

             <div className="flex items-center gap-2">
                <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                    <ChevronLeft size={16} /> {t('common.prev')}
                </button>
                <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                    {t('common.next')} <ChevronRight size={16} />
                </button>
             </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="h-full w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${getLevelBadgeColor(selectedLog.level)}`}>
                            {getLevelIcon(selectedLog.level)}
                            {selectedLog.level}
                        </span>
                        <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                            {new Date(selectedLog.created_at).toLocaleString()}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handlePrevLog}
                            disabled={logs.indexOf(selectedLog) === 0}
                            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30"
                            title="Previous Log"
                        >
                            <ArrowUp size={18} />
                        </button>
                        <button 
                            onClick={handleNextLog}
                            disabled={logs.indexOf(selectedLog) === logs.length - 1}
                            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30"
                            title="Next Log"
                        >
                            <ArrowDown size={18} />
                        </button>
                        <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
                        <button 
                            onClick={() => setSelectedLog(null)}
                            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Message */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Message</h3>
                        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-200 whitespace-pre-wrap font-medium">
                            {selectedLog.message}
                        </div>
                    </div>

                    {/* Meta Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">App ID</h3>
                            <p className="text-slate-900 dark:text-white font-mono">{selectedLog.app_id || 'System'}</p>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">IP Address</h3>
                            <p className="text-slate-900 dark:text-white font-mono">{selectedLog.ip_address || '-'}</p>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 col-span-2">
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Log ID</h3>
                            <p className="text-slate-900 dark:text-white font-mono text-xs truncate" title={selectedLog.id}>{selectedLog.id}</p>
                        </div>
                    </div>

                    {/* Context */}
                    {selectedLog.context && Object.keys(selectedLog.context).length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Context</h3>
                            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 overflow-x-auto">
                                <pre className="text-xs font-mono text-slate-700 dark:text-slate-300">
                                    {JSON.stringify(selectedLog.context, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}

                    {/* Stack Trace */}
                    {selectedLog.stack_trace && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 text-rose-500 flex items-center gap-2">
                                <Bug size={16} />
                                Stack Trace
                            </h3>
                            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/50 overflow-x-auto">
                                <pre className="text-xs font-mono text-rose-700 dark:text-rose-300 whitespace-pre">
                                    {selectedLog.stack_trace}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
