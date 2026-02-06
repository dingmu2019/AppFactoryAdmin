import { useState, useEffect } from 'react';
import { Database, LayoutTemplate, Table2, Code2, AlertCircle, RefreshCw } from 'lucide-react';
import { TableList } from './components/TableList';
import { SchemaView } from './components/SchemaView';
import { DataView } from './components/DataView';
import { SqlScriptView } from './components/SqlScriptView';
import { useToast, useI18n, usePageHeader } from '../../../contexts';
import type { SchemaInfo } from './types';

type Tab = 'schema' | 'data' | 'sql';

export default function DatabasePage() {
  const { showToast } = useToast();
  const { t } = useI18n();
  const { setPageHeader } = usePageHeader();

  useEffect(() => {
    setPageHeader(t('database.listTitle'), t('database.listTitle') + ' - ' + t('database.schema'));
  }, [setPageHeader, t]);
  
  // Tables State
  const [tables, setTables] = useState<any[]>([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Table Details State
  const [schema, setSchema] = useState<SchemaInfo | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  
  // UI State
  const [activeTab, setActiveTab] = useState<Tab>('schema');
  const [error, setError] = useState<string | null>(null);

  // Fetch Tables
  const fetchTables = async () => {
    setTablesLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/database/tables');
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error || 'Failed to fetch tables');
      
      setTables(json);
      // Select first table by default if available
      if (json.length > 0 && !selectedTable) {
        setSelectedTable(json[0].name);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setTablesLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  // Fetch Schema when table selected
  useEffect(() => {
    if (!selectedTable) return;
    
    const fetchSchema = async () => {
      setSchemaLoading(true);
      try {
        const res = await fetch(`/api/database/schema?table=${selectedTable}`);
        const json = await res.json();
        
        if (!res.ok) throw new Error(json.error || 'Failed to fetch schema');
        
        setSchema(json);
      } catch (err: any) {
        console.error(err);
        showToast(`Failed to load schema: ${err.message}`, 'error');
      } finally {
        setSchemaLoading(false);
      }
    };

    fetchSchema();
    // Reset tab to schema when table changes? Maybe keep current tab is better UX.
    // setActiveTab('schema'); 
  }, [selectedTable]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="text-center p-8 max-w-md">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} className="text-rose-600 dark:text-rose-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">数据库连接失败</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">{error}</p>
            <button 
                onClick={fetchTables}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/30 flex items-center gap-2 mx-auto"
            >
                <RefreshCw size={18} />
                重试连接
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-100px)] bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Left Sidebar */}
      <TableList 
        tables={tables}
        selectedTable={selectedTable}
        onSelectTable={setSelectedTable}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        isLoading={tablesLoading}
      />

      {/* Right Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900">
        {/* Tabs Header */}
        {selectedTable ? (
            <>
                <div className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30">
                    <button
                        onClick={() => setActiveTab('schema')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === 'schema'
                                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
                        }`}
                    >
                        <LayoutTemplate size={16} />
                        {t('database.schema')}
                    </button>
                    <button
                        onClick={() => setActiveTab('data')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === 'data'
                                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
                        }`}
                    >
                        <Table2 size={16} />
                        {t('database.data')}
                    </button>
                    <button
                        onClick={() => setActiveTab('sql')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === 'sql'
                                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
                        }`}
                    >
                        <Code2 size={16} />
                        {t('database.sql')}
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-auto">
                    {activeTab === 'schema' && schema && (
                        <SchemaView schema={schema} isLoading={schemaLoading} />
                    )}
                    {activeTab === 'data' && (
                        <DataView tableName={selectedTable} />
                    )}
                    {activeTab === 'sql' && schema && (
                        <SqlScriptView schema={schema} />
                    )}
                </div>
            </>
        ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Database size={64} className="mb-4 opacity-20" />
                <p>{t('database.selectHint')}</p>
            </div>
        )}
      </div>
    </div>
  );
}
