import React, { useState } from 'react';
import { Search, Table, Database, Download } from 'lucide-react';
import { useI18n, useToast } from '../../../../contexts';
import { authenticatedFetch } from '../../../../lib/http';

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
  const { t } = useI18n();
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exportMode, setExportMode] = useState<'schema' | 'bootstrap'>('schema');
  const [includeData, setIncludeData] = useState(true);
  const [includeRls, setIncludeRls] = useState(false);
  const [seedTables, setSeedTables] = useState('');

  // Filter tables
  const filteredTables = tables.filter(t => {
    const term = searchTerm.toLowerCase();
    const matchName = t.name.toLowerCase().includes(term);
    const matchField = t.columns && t.columns.some((c: string) => c.toLowerCase().includes(term));
    return matchName || matchField;
  });

  const handleExport = async () => {
    setIsExporting(true);
    showToast(t('database.exporting'), 'info');
    try {
        const params = new URLSearchParams();
        params.set('mode', exportMode);
        if (exportMode === 'bootstrap') {
          params.set('includeData', includeData ? 'true' : 'false');
          params.set('includeRls', includeRls ? 'true' : 'false');
          if (seedTables.trim()) params.set('seedTables', seedTables.trim());
        }

        const requestUrl = `/api/database/export${params.toString() ? `?${params.toString()}` : ''}`;
        const res = await authenticatedFetch(requestUrl);
        if (!res.ok) throw new Error('Export failed');
        
        // Create download link
        const blob = await res.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = `database_${exportMode}_export_${new Date().toISOString().split('T')[0]}.sql`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(objectUrl);
        document.body.removeChild(a);
        
        showToast(t('database.exportSuccess'), 'success');
    } catch (error: any) {
        console.error('Export error:', error);
        showToast(t('database.exportFailed') + ': ' + error.message, 'error');
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
            {t('database.listTitle')}
            </h2>
            <button 
                onClick={() => {
                  if (exportMode === 'bootstrap') {
                    setIncludeData(true);
                    setIncludeRls(false);
                  }
                  setShowExportOptions(true);
                }}
                disabled={isExporting}
                title={t('database.exportTitle')}
                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors disabled:opacity-50"
            >
                {isExporting ? <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <Download size={18} />}
            </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder={t('database.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      {showExportOptions && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowExportOptions(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-200 dark:border-slate-800">
              <div className="text-lg font-bold text-slate-900 dark:text-white">{t('database.exportTitle')}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('database.exportDesc')}</div>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('database.exportMode')}</div>
                <select
                  value={exportMode}
                  onChange={(e) => {
                    const v = e.target.value as 'schema' | 'bootstrap';
                    setExportMode(v);
                    if (v === 'schema') {
                      setIncludeData(false);
                      setIncludeRls(false);
                    } else {
                      setIncludeData(true);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="schema">{t('database.exportModeSchema')}</option>
                  <option value="bootstrap">{t('database.exportModeBootstrap')}</option>
                </select>
              </div>

              {exportMode === 'bootstrap' && (
                <div className="space-y-3">
                  <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
                    <div>
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{t('database.includeData')}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{t('database.includeDataDesc')}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeData}
                      onChange={(e) => setIncludeData(e.target.checked)}
                      className="h-4 w-4"
                    />
                  </label>

                  <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
                    <div>
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{t('database.includeRls')}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{t('database.includeRlsDesc')}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeRls}
                      onChange={(e) => setIncludeRls(e.target.checked)}
                      className="h-4 w-4"
                    />
                  </label>

                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('database.seedTables')}</div>
                    <input
                      type="text"
                      value={seedTables}
                      onChange={(e) => setSeedTables(e.target.value)}
                      placeholder={t('database.seedTablesPlaceholder')}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex justify-end gap-2">
              <button
                onClick={() => setShowExportOptions(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors"
              >
                {t('database.exportCancel')}
              </button>
              <button
                onClick={async () => {
                  setShowExportOptions(false);
                  await handleExport();
                }}
                disabled={isExporting}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors disabled:opacity-50"
              >
                {t('database.exportConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            {t('database.noMatch')}
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
                        {t('database.matchField')}
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
