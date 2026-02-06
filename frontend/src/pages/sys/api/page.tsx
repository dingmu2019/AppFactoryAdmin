import { useState, useEffect } from 'react';
import { 
  Search, 
  Eye, 
  Lock, 
  Unlock,
  BookOpen,
  Code2,
  Shield,
  Globe,
  RefreshCw,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  TestTube2,
  Activity,
  Copy
} from 'lucide-react';
import { useI18n, usePageHeader } from '../../../contexts';
import { authenticatedFetch } from '../../../lib/http';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { toast } from "sonner";

interface ApiEndpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  summary: string;
  description: string;
  category: string;
  authRequired: boolean;
  requestSchema?: any;
  responseSchema?: any;
}

export default function SysApiMgmtPage() {
  const { t } = useI18n();
  const { setPageHeader } = usePageHeader();
  const [apis, setApis] = useState<ApiEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // @ts-ignore
    setPageHeader(t('api.title'), t('api.subtitle'));
  }, [setPageHeader, t]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [selectedApi, setSelectedApi] = useState<ApiEndpoint | null>(null);

  const fetchApis = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/admin/apis');
      if (res.ok) {
        const json = await res.json();
        // Check if response is { data: [...], total: ... } or just [...]
        const dataList = Array.isArray(json) ? json : (json.data || []);
        setApis(dataList);
      } else {
        const errorText = await res.text();
        console.error(`Failed to fetch APIs: ${res.status} ${res.statusText}`, errorText);
      }
    } catch (err) {
      console.error('Failed to fetch APIs (Network/Client Error):', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApis();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  // Derived State
  const categories = Array.from(new Set(apis.map(api => api.category)));
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  const filteredApis = apis.filter(api => {
    const matchesSearch = api.path.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          api.summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = !methodFilter || api.method === methodFilter;
    const matchesCategory = !categoryFilter || api.category === categoryFilter;
    
    return matchesSearch && matchesMethod && matchesCategory;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredApis.length / pageSize);
  const paginatedApis = filteredApis.slice((page - 1) * pageSize, page * pageSize);

  // Stats
  const totalCount = apis.length;
  const publicCount = apis.filter(a => !a.authRequired).length;
  const protectedCount = apis.filter(a => a.authRequired).length;

  const MethodBadge = ({ method }: { method: string }) => {
    const colors: Record<string, string> = {
      GET: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
      POST: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800',
      PUT: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
      DELETE: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800',
      PATCH: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
    };
    
    return (
      <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold font-mono border ${colors[method] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
        {method}
      </span>
    );
  };

  const getAuthType = (api: ApiEndpoint) => {
    const inferred = api.path.startsWith('/api/v1/') ? 'appKey' : api.authRequired ? 'bearer' : 'none';
    return api.requestSchema?.auth?.type || inferred;
  };

  const SchemaViewer = ({ schema, type }: { schema: any, type: 'request' | 'response' }) => {
    if (!schema) return <div className="text-xs text-slate-400 italic">No schema defined</div>;

    // Check if it's a Response Schema (Keyed by Status Code)
    if (type === 'response' && !schema.type && !schema.properties && Object.keys(schema).some(k => !isNaN(Number(k)))) {
        return (
            <div className="space-y-4">
                {Object.entries(schema).map(([code, config]: [string, any]) => (
                    <div key={code} className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                                code.startsWith('2') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                code.startsWith('3') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                            }`}>
                                {code}
                            </span>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{config.description}</span>
                        </div>
                        {config.schema && (
                            <div className="p-4 bg-white dark:bg-slate-900">
                                <JsonSchemaViewer schema={config.schema} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    // Check for Structured Request Schema (headers, query, body)
    const hasStructuredReq = schema.headers || schema.query || schema.body;
    if (type === 'request' && hasStructuredReq) {
         return (
             <div className="space-y-6">
                 {schema.headers && schema.headers.length > 0 && (
                     <ParameterTable title="Headers" params={schema.headers} />
                 )}
                 {schema.query && schema.query.length > 0 && (
                     <ParameterTable title="Query Parameters" params={schema.query} />
                 )}
                 {schema.body && (
                    <div>
                        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Request Body</h5>
                        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-white dark:bg-slate-900">
                            <JsonSchemaViewer schema={schema.body} />
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Fallback: Check for Markdown
    if (schema.markdown) {
        return (
            <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{schema.markdown}</ReactMarkdown>
            </div>
        );
    }

    // Fallback: JSON Dump
    return (
        <pre className="text-xs font-mono text-slate-600 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
            {JSON.stringify(schema, null, 2)}
        </pre>
    );
  };

  const ParameterTable = ({ title, params }: { title: string, params: any[] }) => (
      <div>
          <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{title}</h5>
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                      <tr>
                          <th className="px-4 py-2 font-medium w-1/4">Name</th>
                          <th className="px-4 py-2 font-medium w-1/6">Type</th>
                          <th className="px-4 py-2 font-medium w-1/6">Required</th>
                          <th className="px-4 py-2 font-medium">Description</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {params.map((p: any, idx: number) => (
                          <tr key={idx} className="bg-white dark:bg-slate-900">
                              <td className="px-4 py-2 font-mono text-slate-700 dark:text-slate-300">
                                  {p.name}
                              </td>
                              <td className="px-4 py-2 text-slate-500">
                                  <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">
                                      {p.type}
                                  </span>
                              </td>
                              <td className="px-4 py-2">
                                  {p.required ? (
                                      <span className="text-rose-500 text-xs font-bold">Yes</span>
                                  ) : (
                                      <span className="text-slate-400 text-xs">No</span>
                                  )}
                              </td>
                              <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                                  {p.description || '-'}
                                  {p.default !== undefined && (
                                      <div className="text-xs text-slate-400 mt-0.5">Default: <code className="text-slate-500">{String(p.default)}</code></div>
                                  )}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
  );

  const JsonSchemaViewer = ({ schema }: { schema: any }) => {
      if (!schema) return null;
      
      // Simple recursive viewer for JSON Schema properties
      if (schema.type === 'object' && schema.properties) {
          return (
              <div className="font-mono text-sm">
                  <div className="text-slate-400 mb-2">{'{'}</div>
                  <div className="pl-4 space-y-2">
                      {Object.entries(schema.properties).map(([key, prop]: [string, any]) => (
                          <div key={key} className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                              <div className="flex items-center gap-2 min-w-[150px]">
                                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">"{key}"</span>
                                  <span className="text-slate-400">:</span>
                                  <span className="text-amber-600 dark:text-amber-500 text-xs bg-amber-50 dark:bg-amber-900/20 px-1 rounded">
                                      {prop.type}
                                  </span>
                                  {schema.required?.includes(key) && (
                                      <span className="text-rose-500 text-[10px] uppercase font-bold" title="Required">*</span>
                                  )}
                              </div>
                              <div className="text-slate-500 dark:text-slate-400 text-xs flex-1">
                                  {prop.description && <span>// {prop.description}</span>}
                                  {prop.format && <span className="ml-2 text-slate-400">({prop.format})</span>}
                                  {prop.enum && <span className="ml-2 text-slate-400">[enum: {prop.enum.join(', ')}]</span>}
                              </div>
                              {/* Recursive render for nested objects */}
                              {prop.type === 'object' && prop.properties && (
                                  <div className="w-full mt-1 border-l-2 border-slate-100 dark:border-slate-800 pl-3">
                                      <JsonSchemaViewer schema={prop} />
                                  </div>
                              )}
                              {/* Recursive render for arrays of objects */}
                              {prop.type === 'array' && prop.items?.type === 'object' && (
                                  <div className="w-full mt-1 border-l-2 border-slate-100 dark:border-slate-800 pl-3">
                                      <div className="text-slate-400 text-xs mb-1">[ Array Items: ]</div>
                                      <JsonSchemaViewer schema={prop.items} />
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
                  <div className="text-slate-400 mt-2">{'}'}</div>
              </div>
          );
      }
      
      // Fallback for array or simple types
      if (schema.type === 'array' && schema.items) {
          return (
              <div className="font-mono text-sm">
                  <span className="text-slate-400">[ </span>
                  <span className="text-amber-600 dark:text-amber-500">{schema.items.type}</span>
                  <span className="text-slate-400"> ]</span>
              </div>
          );
      }

      return <div className="font-mono text-sm text-slate-500">{JSON.stringify(schema)}</div>;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="list" className="w-full">
          <div className="flex justify-between items-center mb-6">
               {/* Header & Stats */}
               <div className="flex flex-col md:flex-row md:items-center justify-start gap-4">
                    {/* Stats Cards */}
                    <div className="flex flex-wrap gap-4">
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 min-w-[140px]">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                                <Code2 size={20} />
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('api.total')}</div>
                                <div className="text-lg font-bold text-slate-900 dark:text-white">{totalCount}</div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 min-w-[140px]">
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                                <Globe size={20} />
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('api.public')}</div>
                                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{publicCount}</div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 min-w-[140px]">
                            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400">
                                <Shield size={20} />
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('api.protected')}</div>
                                <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{protectedCount}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <TabsList>
                    <TabsTrigger value="list">API List</TabsTrigger>
                    <TabsTrigger value="sdks">Client SDKs</TabsTrigger>
                    <TabsTrigger value="sandbox">Sandbox</TabsTrigger>
                </TabsList>
          </div>

          <TabsContent value="list">
              {/* Toolbar */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                <div className="flex flex-1 items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder={t('api.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                    </div>

                    <select 
                        value={methodFilter}
                        onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}
                        className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 hidden sm:block"
                    >
                        <option value="">{t('api.allMethods')}</option>
                        {methods.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>

                    <select 
                        value={categoryFilter}
                        onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                        className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 hidden sm:block"
                    >
                        <option value="">{t('api.allCategories')}</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                   <button 
                     onClick={fetchApis}
                     className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                     title={t('common.refresh')}
                   >
                     <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                   </button>
                   <button
                     onClick={() => window.open('/api/docs', '_blank', 'noopener,noreferrer')}
                     className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors w-full justify-center md:w-auto"
                   >
                      <BookOpen size={16} /> 
                      <span>{t('api.docs')}</span>
                   </button>
                </div>
              </div>

              {/* API List */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('api.table.endpoint')}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('api.table.summary')}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('api.table.category')}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('api.table.auth')}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">{t('api.table.action')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {loading ? (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                <RefreshCw className="animate-spin mx-auto mb-2" />
                                {t('api.loading')}
                            </td>
                        </tr>
                      ) : filteredApis.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500">{t('api.empty')}</td>
                        </tr>
                      ) : (
                        paginatedApis.map((api) => (
                          <tr key={api.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <MethodBadge method={api.method} />
                                <code className="text-sm font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 group-hover:border-indigo-200 dark:group-hover:border-indigo-800 transition-colors">
                                  {api.path}
                                </code>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                              <div className="font-medium text-slate-900 dark:text-white">{api.summary}</div>
                              <div className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{api.description}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                              <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium border border-slate-200 dark:border-slate-700">
                                {api.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {api.authRequired ? (
                                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400" title="Authentication Required">
                                  <Lock size={14} />
                                  <span className="text-xs font-medium">{t('api.table.required')}</span>
                                </div>
                              ) : (
                                 <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400" title="Public API">
                                  <Unlock size={14} />
                                  <span className="text-xs font-medium">{t('api.table.public')}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => setSelectedApi(api)}
                                className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
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
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {t('common.showing')} {Math.min((page - 1) * pageSize + 1, filteredApis.length)} {t('common.to')} {Math.min(page * pageSize, filteredApis.length)} {t('common.of')} {filteredApis.length} {t('common.results')}
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1"
                    >
                      <ChevronLeft size={16} />
                      {t('common.prev')}
                    </button>
                    <button 
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages || totalPages === 0}
                      className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1"
                    >
                      {t('common.next')}
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
          </TabsContent>

          <TabsContent value="sdks" className="mt-6">
                <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Code2 className="h-5 w-5 text-indigo-500" />
                            {t('api.sdks.title')}
                        </CardTitle>
                        <CardDescription>
                            {t('api.sdks.desc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-3 gap-4">
                        {[
                            { lang: 'TypeScript', icon: 'TS', cmd: 'npm install @adminsys/sdk', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
                            { lang: 'Python', icon: 'PY', cmd: 'pip install adminsys-sdk', color: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
                            { lang: 'Java', icon: 'JV', cmd: 'mvn dependency:get -Dartifact=com.adminsys:sdk:1.0.0', color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
                        ].map((sdk) => (
                            <div key={sdk.lang} className={`p-4 rounded-xl border ${sdk.color} border-opacity-20 flex flex-col gap-3`}>
                                <div className="flex items-center justify-between">
                                    <div className="font-bold text-lg">{sdk.lang}</div>
                                    <div className={`text-xs font-mono px-2 py-1 rounded bg-white/50 dark:bg-black/20`}>v1.2.0</div>
                                </div>
                                <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-xs break-all relative group">
                                    {sdk.cmd}
                                    <button 
                                        onClick={() => copyToClipboard(sdk.cmd)}
                                        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-700 p-1 rounded hover:bg-slate-600"
                                    >
                                        <Copy className="h-3 w-3" />
                                    </button>
                                </div>
                                <Button variant="outline" size="sm" className="w-full bg-white/50 dark:bg-black/20 border-0 hover:bg-white/80 dark:hover:bg-black/40">
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="sandbox" className="mt-6">
                <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
                        <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TestTube2 className="h-5 w-5 text-amber-500" />
                            {t('api.sandbox.title')}
                        </CardTitle>
                        <CardDescription>
                            {t('api.sandbox.desc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Test API Key</label>
                                <div className="flex gap-2">
                                    <code className="flex-1 bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg font-mono text-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                                        sk_test_51Mz...Xy9z
                                    </code>
                                    <Button variant="outline" size="icon" onClick={() => copyToClipboard('sk_test_51Mz...Xy9z')}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-500">Use this key for requests to <code>https://api-sandbox.your-saas.com</code></p>
                            </div>
                                <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Test Webhook Secret</label>
                                <div className="flex gap-2">
                                    <code className="flex-1 bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg font-mono text-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                                        whsec_test_...
                                    </code>
                                    <Button variant="outline" size="icon" onClick={() => copyToClipboard('whsec_test_...')}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                            <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                <Activity className="h-4 w-4 text-slate-500" />
                                Recent Webhook Deliveries (Sandbox)
                            </h4>
                            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                                        <tr>
                                            <th className="p-3 font-medium">Event</th>
                                            <th className="p-3 font-medium">Time</th>
                                            <th className="p-3 font-medium">Status</th>
                                            <th className="p-3 font-medium text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {[
                                            { id: 1, event: 'payment.succeeded', time: '2 mins ago', status: 200 },
                                            { id: 2, event: 'order.created', time: '15 mins ago', status: 200 },
                                            { id: 3, event: 'user.signup', time: '1 hour ago', status: 500 },
                                        ].map(log => (
                                            <tr key={log.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="p-3 font-mono text-xs">{log.event}</td>
                                                <td className="p-3 text-slate-500">{log.time}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                        log.status === 200 
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                    }`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <Button variant="ghost" size="sm" className="h-7 text-xs">Replay</Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      {selectedApi && (
        (() => {
          const authType = getAuthType(selectedApi);
          return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setSelectedApi(null)}
        >
            <div 
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <MethodBadge method={selectedApi.method} />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white font-mono">{selectedApi.path}</h3>
                    </div>
                    <button onClick={() => setSelectedApi(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <XCircle size={24} />
                    </button>
                </div>
                
                <div className="p-8 overflow-y-auto space-y-8">
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('api.detail.desc')}</h4>
                        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{selectedApi.description}</p>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t('api.detail.auth')}</h4>
                        {authType !== 'none' ? (
                            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg p-4">
                                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium flex items-center gap-2 mb-2">
                                    <Lock size={16} /> {t('api.detail.authReq')}
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                    {t('api.detail.authHeaders')}
                                </p>
                                <ul className="mt-2 space-y-1 text-xs font-mono text-amber-900 dark:text-amber-100">
                                    {authType === 'appKey' ? (
                                      <>
                                        <li>x-app-key: &lt;YOUR_APP_KEY&gt;</li>
                                        <li>x-app-secret: &lt;YOUR_APP_SECRET&gt;</li>
                                      </>
                                    ) : (
                                      <li>Authorization: Bearer &lt;ACCESS_TOKEN&gt;</li>
                                    )}
                                </ul>
                            </div>
                        ) : (
                            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 rounded-lg p-4">
                                <p className="text-sm text-emerald-800 dark:text-emerald-200 font-medium flex items-center gap-2">
                                    <Unlock size={16} /> {t('api.detail.publicEp')}
                                </p>
                                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                                    {t('api.detail.publicDesc')}
                                </p>
                            </div>
                        )}
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Request Parameters</h4>
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 overflow-x-auto">
                            <SchemaViewer schema={selectedApi.requestSchema} type="request" />
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Response Schema</h4>
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 overflow-x-auto">
                            <SchemaViewer schema={selectedApi.responseSchema} type="response" />
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t('api.detail.example')}</h4>
                        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 overflow-x-auto relative group">
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    className="p-1.5 text-slate-400 hover:text-white bg-white/10 rounded"
                                    onClick={() => navigator.clipboard.writeText(`curl -X ${selectedApi.method} https://api.super-indie.com${selectedApi.path} ...`)}
                                >
                                    <Code2 size={14} />
                                </button>
                            </div>
                            <pre className="text-xs font-mono text-emerald-400 leading-relaxed">
{`curl -X ${selectedApi.method} https://api.super-indie.com${selectedApi.path} \\
${authType === 'appKey' ? '  -H "x-app-key: YOUR_APP_KEY" \\\n  -H "x-app-secret: YOUR_APP_SECRET" \\' : authType === 'bearer' ? '  -H "Authorization: Bearer ACCESS_TOKEN" \\' : ''}
  -H "Content-Type: application/json"`}
                            </pre>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end">
                    <button 
                        onClick={() => setSelectedApi(null)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-indigo-500/20"
                    >
                        {t('api.detail.close')}
                    </button>
                </div>
            </div>
        </div>
          );
        })()
      )}
    </div>
  );
}
