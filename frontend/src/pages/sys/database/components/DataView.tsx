import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Eye, X, Copy, RefreshCw } from 'lucide-react';
import { useToast, useI18n } from '../../../../contexts';

interface DataViewProps {
  tableName: string;
}

export const DataView: React.FC<DataViewProps> = ({ tableName }) => {
  const { showToast } = useToast();
  const { t } = useI18n();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalContent, setModalContent] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/database/data?table=${tableName}&page=${page}&pageSize=${pageSize}`);
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error || 'Failed to fetch data');

      setData(json.data);
      setTotal(json.pagination.total);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [tableName]);

  useEffect(() => {
    fetchData();
  }, [tableName, page, pageSize]);

  const totalPages = Math.ceil(total / pageSize);

  const renderCell = (value: any) => {
    if (value === null || value === undefined) return <span className="text-slate-300 italic">NULL</span>;
    if (typeof value === 'boolean') return <span className={value ? 'text-emerald-600' : 'text-rose-600'}>{String(value)}</span>;
    if (typeof value === 'object') return <span className="font-mono text-xs text-slate-500">{JSON.stringify(value).substring(0, 50)}...</span>;
    
    const str = String(value);
    if (str.length > 100) {
      return (
        <div className="flex items-center gap-2">
          <span className="truncate max-w-[200px]">{str.substring(0, 100)}...</span>
          <button 
            onClick={() => setModalContent(str)}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-indigo-600 transition-colors"
            title={t('database.dataView.viewFull')}
          >
            <Eye size={14} />
          </button>
        </div>
      );
    }
    return str;
  };

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
        <div className="text-rose-500 mb-2">Error loading data</div>
        <p className="text-slate-500 mb-4">{error}</p>
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          {t('database.retry')}
        </button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <p>暂无数据</p>
      </div>
    );
  }

  const columns = Object.keys(data[0]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
        <div className="text-sm text-slate-500">
          {t('database.dataView.total')} <span className="font-medium text-slate-900 dark:text-white">{total}</span> {t('database.dataView.records')}
        </div>
        <div className="flex items-center gap-4">
            <button 
                onClick={fetchData}
                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title={t('agents.refresh')}
            >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">{t('database.dataView.perPage')}</span>
                <select 
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                </select>
            </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 shadow-sm">
                <tr>
                    {columns.map(col => (
                        <th key={col} className="px-6 py-3 font-medium text-slate-500 text-xs uppercase border-b border-slate-200 dark:border-slate-800 whitespace-nowrap">
                            {col}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {data.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        {columns.map(col => (
                            <td key={col} className="px-6 py-3 border-b border-slate-50 dark:border-slate-800/50 max-w-xs truncate">
                                {renderCell(row[col])}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
        <button 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 text-sm"
        >
            <ChevronLeft size={16} /> {t('database.dataView.prev')}
        </button>
        <span className="text-sm text-slate-500">
            {t('common.showing')} {page} / {totalPages || 1}
        </span>
        <button 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 text-sm"
        >
            {t('database.dataView.next')} <ChevronRight size={16} />
        </button>
      </div>

      {/* Detail Modal */}
      {modalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
                    <h3 className="font-bold text-slate-900 dark:text-white">{t('database.dataView.fullContent')}</h3>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(modalContent);
                                showToast(t('database.dataView.copied'), 'success');
                            }}
                            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500"
                            title={t('apps.ai.copy')}
                        >
                            <Copy size={18} />
                        </button>
                        <button 
                            onClick={() => setModalContent(null)}
                            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
                <div className="p-6 overflow-y-auto font-mono text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                    {modalContent}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
