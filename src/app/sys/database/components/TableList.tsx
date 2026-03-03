import React, { useState } from 'react';
import { Search, Table, Database, Download, Terminal, Code2 } from 'lucide-react';
import { useI18n, useToast } from '../../../../contexts';
import { authenticatedFetch } from '../../../../lib/http';
import type { ProcedureInfo } from '../types';

interface TableListProps {
  tables: any[];
  procedures: ProcedureInfo[];
  selectedTable: string | null;
  selectedProcedure: number | null;
  onSelectTable: (name: string) => void;
  onSelectProcedure: (oid: number) => void;
  listType: 'tables' | 'procedures';
  onListTypeChange: (type: 'tables' | 'procedures') => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  isLoading: boolean;
}

export const TableList: React.FC<TableListProps> = ({
  tables,
  procedures,
  selectedTable,
  selectedProcedure,
  onSelectTable,
  onSelectProcedure,
  listType,
  onListTypeChange,
  searchTerm,
  onSearchChange,
  isLoading
}) => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exportMode, setExportMode] = useState<'schema' | 'bootstrap'>('schema');
  const [includeData, setIncludeData] = useState(true);
  const [includeRls, setIncludeRls] = useState(false);
  const [seedTables, setSeedTables] = useState('');

  const handleBackup = async () => {
    setIsBackingUp(true);
    showToast(t('database.backingUp'), 'info');
    try {
      const res = await authenticatedFetch('/api/database/backup?compress=gzip');
      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || 'Backup failed');
      }

      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `database_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.sql.gz`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(objectUrl);
      document.body.removeChild(a);
      showToast(t('database.backupSuccess'), 'success');
    } catch (error: any) {
      console.error('Backup error:', error);
      showToast(t('database.backupFailed') + ': ' + (error?.message || ''), 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  // Filter items based on listType
  const filteredItems = listType === 'tables' 
    ? tables.filter(t => {
        const term = searchTerm.toLowerCase();
        const matchName = t.name.toLowerCase().includes(term);
        // Safely check if columns is an array before calling some
        const matchField = Array.isArray(t.columns) && t.columns.some((c: string) => c.toLowerCase().includes(term));
        return matchName || matchField;
      })
    : procedures.filter(p => {
        const term = searchTerm.toLowerCase();
        return p.name.toLowerCase().includes(term) || (p.comment && p.comment.toLowerCase().includes(term));
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
        if (!res.ok) throw new Error(t('database.exportFailed'));
        
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
    <div className="flex flex-col h-full border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 w-80">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Database size={20} className="text-indigo-600" />
            {t('database.listTitle')}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={handleBackup}
                disabled={isBackingUp}
                title={t('database.backupTitle')}
                className="p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors disabled:opacity-50"
              >
                {isBackingUp ? (
                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download size={18} />
                )}
              </button>
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
                className="p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors disabled:opacity-50"
              >
                {isExporting ? (
                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Code2 size={18} />
                )}
              </button>
            </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg mb-4">
          <button
            onClick={() => onListTypeChange('tables')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
              listType === 'tables'
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {t('database.tablesTab')}
          </button>
          <button
            onClick={() => onListTypeChange('procedures')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
              listType === 'procedures'
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {t('database.proceduresTab')}
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input
            type="text"
            placeholder={listType === 'tables' ? t('database.searchPlaceholder') : t('database.searchProcedurePlaceholder')}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      {showExportOptions && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowExportOptions(false)}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
              <div className="text-lg font-bold text-zinc-900 dark:text-white">{t('database.exportTitle')}</div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{t('database.exportDesc')}</div>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t('database.exportMode')}</div>
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
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="schema">{t('database.exportModeSchema')}</option>
                  <option value="bootstrap">{t('database.exportModeBootstrap')}</option>
                </select>
              </div>

              {exportMode === 'bootstrap' && (
                <div className="space-y-3">
                  <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40">
                    <div>
                      <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{t('database.includeData')}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">{t('database.includeDataDesc')}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeData}
                      onChange={(e) => setIncludeData(e.target.checked)}
                      className="h-4 w-4"
                    />
                  </label>

                  <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40">
                    <div>
                      <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{t('database.includeRls')}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">{t('database.includeRlsDesc')}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeRls}
                      onChange={(e) => setIncludeRls(e.target.checked)}
                      className="h-4 w-4"
                    />
                  </label>

                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t('database.seedTables')}</div>
                    <input
                      type="text"
                      value={seedTables}
                      onChange={(e) => setSeedTables(e.target.value)}
                      placeholder={t('database.seedTablesPlaceholder')}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 flex justify-end gap-2">
              <button
                onClick={() => setShowExportOptions(false)}
                className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 transition-colors"
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
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            {t('database.noMatch')}
          </div>
        ) : (
          filteredItems.map((item: any) => {
             const term = searchTerm.toLowerCase();
             
             if (listType === 'tables') {
               // Safely check if columns is an array before calling some
               const matchField = searchTerm && Array.isArray(item.columns) && item.columns.some((c: string) => c.toLowerCase().includes(term)) && !item.name.toLowerCase().includes(term);
               
               return (
                <button
                  key={item.name}
                  onClick={() => onSelectTable(item.name)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all group ${
                    selectedTable === item.name
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    <Table size={16} className={selectedTable === item.name ? 'text-indigo-200' : 'text-zinc-400'} />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.comment && (
                    <div className={`text-xs mt-1 truncate ${
                      selectedTable === item.name ? 'text-indigo-200' : 'text-zinc-400'
                    }`}>
                      {item.comment}
                    </div>
                  )}
                  {matchField && (
                      <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          {t('database.matchField')}
                      </div>
                  )}
                </button>
              );
             } else {
               // Stored Procedures
               return (
                <button
                  key={item.oid}
                  onClick={() => onSelectProcedure(item.oid)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all group ${
                    selectedProcedure === item.oid
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    <Terminal size={16} className={selectedProcedure === item.oid ? 'text-indigo-200' : 'text-zinc-400'} />
                    <span className="truncate">{item.name}</span>
                  </div>
                  <div className={`text-[10px] mt-0.5 font-mono truncate ${
                    selectedProcedure === item.oid ? 'text-indigo-100' : 'text-zinc-400'
                  }`}>
                    {item.result_type}
                  </div>
                  {item.comment && (
                    <div className={`text-xs mt-1 truncate ${
                      selectedProcedure === item.oid ? 'text-indigo-200' : 'text-zinc-400'
                    }`}>
                      {item.comment}
                    </div>
                  )}
                </button>
              );
             }
          })
        )}
      </div>
    </div>
  );
};
