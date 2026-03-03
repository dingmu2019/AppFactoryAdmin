
'use client';

import { useState, useEffect } from 'react';
import { Database, LayoutTemplate, Table2, Code2, AlertCircle, RefreshCw } from 'lucide-react';
import { TableList } from './components/TableList';
import { SchemaView } from './components/SchemaView';
import { DataView } from './components/DataView';
import { SqlScriptView } from './components/SqlScriptView';
import { ProcedureView } from './components/ProcedureView';
import { useToast, useI18n, usePageHeader } from '@/contexts';
import { authenticatedFetch, safeResponseJson } from '@/lib/http';
import type { SchemaInfo, ProcedureInfo } from './types';

type Tab = 'schema' | 'data' | 'sql' | 'procedure';
type ListType = 'tables' | 'procedures';

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
  
  // Procedures State
  const [procedures, setProcedures] = useState<ProcedureInfo[]>([]);
  const [proceduresLoading, setProceduresLoading] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<number | null>(null);
  const [procedureDetail, setProcedureDetail] = useState<ProcedureInfo | null>(null);
  const [procedureLoading, setProcedureLoading] = useState(false);

  // List View State
  const [listType, setListType] = useState<ListType>('tables');
  
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
      const res = await authenticatedFetch('/api/database/tables');
      const json = await safeResponseJson(res);
      
      if (!res.ok) throw new Error(json.error || 'Failed to fetch tables');
      
      setTables(json);
      if (json.length > 0 && !selectedTable && listType === 'tables') {
        setSelectedTable(json[0].name);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setTablesLoading(false);
    }
  };

  // Fetch Procedures
  const fetchProcedures = async () => {
    setProceduresLoading(true);
    try {
      const res = await authenticatedFetch('/api/database/procedures');
      const json = await safeResponseJson(res);
      if (!res.ok) throw new Error(json.error || 'Failed to fetch procedures');
      setProcedures(json);
      if (json.length > 0 && !selectedProcedure && listType === 'procedures') {
        setSelectedProcedure(json[0].oid);
      }
    } catch (err: any) {
      console.error(err);
      showToast(`${t('common.loadFailed')}: ${err.message}`, 'error');
    } finally {
      setProceduresLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
    fetchProcedures();
  }, []);

  // Handle list type change
  useEffect(() => {
    if (listType === 'tables' && tables.length > 0 && !selectedTable) {
      setSelectedTable(tables[0].name);
    } else if (listType === 'procedures' && procedures.length > 0 && !selectedProcedure) {
      setSelectedProcedure(procedures[0].oid);
    }
  }, [listType, tables, procedures]);

  // Fetch Schema when table selected
  useEffect(() => {
    if (!selectedTable || listType !== 'tables') return;
    
    const fetchSchema = async () => {
      setSchemaLoading(true);
      try {
        const res = await authenticatedFetch(`/api/database/schema?table=${selectedTable}`);
        const json = await safeResponseJson(res);
        
        if (!res.ok) throw new Error(json.error || 'Failed to fetch schema');
        
        setSchema(json);
        setActiveTab('schema');
      } catch (err: any) {
        console.error(err);
        showToast(`${t('common.loadFailed')}: ${err.message}`, 'error');
      } finally {
        setSchemaLoading(false);
      }
    };

    fetchSchema();
  }, [selectedTable, listType]);

  // Fetch Procedure detail when procedure selected
  useEffect(() => {
    if (!selectedProcedure || listType !== 'procedures') return;

    const fetchProcedureDetail = async () => {
      setProcedureLoading(true);
      try {
        const res = await authenticatedFetch(`/api/database/procedures/definition?oid=${selectedProcedure}`);
        const json = await safeResponseJson(res);
        if (!res.ok) throw new Error(json.error || 'Failed to fetch procedure definition');
        
        const proc = procedures.find(p => p.oid === selectedProcedure);
        setProcedureDetail({ ...proc!, ...json });
        setActiveTab('procedure');
      } catch (err: any) {
        console.error(err);
        showToast(`${t('common.loadFailed')}: ${err.message}`, 'error');
      } finally {
        setProcedureLoading(false);
      }
    };

    fetchProcedureDetail();
  }, [selectedProcedure, listType, procedures]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)] bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="text-center p-8 max-w-md">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} className="text-rose-600 dark:text-rose-400" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{t('database.connectError')}</h2>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6">{error}</p>
            <button 
                onClick={fetchTables}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/30 flex items-center gap-2 mx-auto"
            >
                <RefreshCw size={18} />
                {t('database.retry')}
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-100px)] bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Left Sidebar */}
      <TableList 
        tables={tables}
        procedures={procedures}
        selectedTable={selectedTable}
        selectedProcedure={selectedProcedure}
        onSelectTable={setSelectedTable}
        onSelectProcedure={setSelectedProcedure}
        listType={listType}
        onListTypeChange={setListType}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        isLoading={listType === 'tables' ? tablesLoading : proceduresLoading}
      />

      {/* Right Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-900">
        {/* Tabs Header */}
        {listType === 'tables' && selectedTable ? (
            <>
                <div className="flex items-center gap-1 p-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/30">
                    <button
                        onClick={() => setActiveTab('schema')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === 'schema'
                                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-zinc-600 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-zinc-800/50'
                        }`}
                    >
                        <LayoutTemplate size={16} />
                        {t('database.schema')}
                    </button>
                    <button
                        onClick={() => setActiveTab('data')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === 'data'
                                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-zinc-600 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-zinc-800/50'
                        }`}
                    >
                        <Table2 size={16} />
                        {t('database.data')}
                    </button>
                    <button
                        onClick={() => setActiveTab('sql')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === 'sql'
                                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-zinc-600 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-zinc-800/50'
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
        ) : listType === 'procedures' && selectedProcedure ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <ProcedureView procedure={procedureDetail} isLoading={procedureLoading} />
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                <Database size={64} className="mb-4 opacity-20" />
                <p>{listType === 'tables' ? t('database.selectHint') : t('database.selectProcedureHint')}</p>
            </div>
        )}
      </div>
    </div>
  );
}
