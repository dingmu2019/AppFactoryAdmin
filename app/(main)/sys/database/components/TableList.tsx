import React, { useState } from 'react';
import { Search, Table, Database, Download } from 'lucide-react';
import { useToast } from '../../../../../contexts';

interface TableListProps {
  tables: any[];
  selectedTable: string | null;
  onSelectTable: (name: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  isLoading: boolean;
}

export const TableList: React.FC<TableListProps> = ({
  tables,
  selectedTable,
  onSelectTable,
  searchTerm,
  onSearchChange,
  isLoading
}) => {
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  // Filter tables
  const filteredTables = tables.filter(t => {
    const term = searchTerm.toLowerCase();
    const matchName = t.name.toLowerCase().includes(term);
    const matchField = t.columns && t.columns.some((c: string) => c.toLowerCase().includes(term));
    return matchName || matchField;
  });

  const handleExport = async () => {
    setIsExporting(true);
    showToast('正在准备导出 SQL 脚本...', 'info');
    try {
        const res = await fetch('/api/database/export');
        if (!res.ok) throw new Error('导出失败');
        
        // 创建下载链接
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `database_export_${new Date().toISOString().split('T')[0]}.sql`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast('导出成功', 'success');
    } catch (error: any) {
        console.error('Export error:', error);
        showToast('导出 SQL 脚本失败: ' + error.message, 'error');
    } finally {
        setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 w-80">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Database size={20} className="text-indigo-600" />
            数据库结构
            </h2>
            <button 
                onClick={handleExport}
                disabled={isExporting}
                title="导出完整 SQL 脚本"
                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors disabled:opacity-50"
            >
                {isExporting ? <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <Download size={18} />}
            </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="搜索表或字段..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            无匹配结果
          </div>
        ) : (
          filteredTables.map(table => {
             const term = searchTerm.toLowerCase();
             const matchField = searchTerm && table.columns?.some((c: string) => c.toLowerCase().includes(term)) && !table.name.toLowerCase().includes(term);
             
             return (
              <button
                key={table.name}
                onClick={() => onSelectTable(table.name)}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all group ${
                  selectedTable === table.name
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  <Table size={16} className={selectedTable === table.name ? 'text-indigo-200' : 'text-slate-400'} />
                  <span className="truncate">{table.name}</span>
                </div>
                {table.comment && (
                  <div className={`text-xs mt-1 truncate ${
                    selectedTable === table.name ? 'text-indigo-200' : 'text-slate-400'
                  }`}>
                    {table.comment}
                  </div>
                )}
                {matchField && (
                    <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                        包含匹配字段
                    </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
