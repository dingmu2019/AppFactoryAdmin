
'use client';

import { useState, useEffect } from 'react';
import { 
  Search, Eye, Lock, Unlock, BookOpen, Code2, Shield, Globe, RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useI18n, usePageHeader } from '@/contexts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiMgmt, type ApiEndpoint } from './hooks/useApiMgmt';
import { ApiDetailModal, MethodBadge } from './components/ApiDetailModal';
import { ClientSdk } from './components/ClientSdk';
import { WebhookConfig } from './components/WebhookConfig';

export default function SysApiMgmtPage() {
  const { t } = useI18n();
  const { setPageHeader } = usePageHeader();
  const {
    loading, searchTerm, setSearchTerm, methodFilter, setMethodFilter, categoryFilter, setCategoryFilter,
    page, setPage, pageSize, paginatedApis, totalPages, filteredApis, stats, categories, methods, fetchApis
  } = useApiMgmt(t);

  const [selectedApi, setSelectedApi] = useState<ApiEndpoint | null>(null);

  useEffect(() => { setPageHeader(t('api.title'), t('api.subtitle')); }, [setPageHeader, t]);

  const getAuthType = (api: ApiEndpoint) => {
    const inferred = api.path.startsWith('/api/v1/') ? 'appKey' : api.authRequired ? 'bearer' : 'none';
    return api.requestSchema?.auth?.type || inferred;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="list" className="w-full">
          <div className="flex justify-between items-center mb-6">
               <div className="flex flex-col md:flex-row md:items-center justify-start gap-4">
                    <div className="flex flex-wrap gap-4">
                        <StatCard icon={<Code2 size={20} />} label={t('api.total')} value={stats.total} color="indigo" />
                        <StatCard icon={<Globe size={20} />} label={t('api.public')} value={stats.public} color="emerald" />
                        <StatCard icon={<Shield size={20} />} label={t('api.protected')} value={stats.protected} color="amber" />
                    </div>
                </div>
                <TabsList><TabsTrigger value="list">{t('api.tabs.list')}</TabsTrigger><TabsTrigger value="sdks">{t('api.tabs.sdks')}</TabsTrigger><TabsTrigger value="webhooks">{t('api.tabs.webhooks')}</TabsTrigger></TabsList>
          </div>

          <TabsContent value="list">
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                <div className="flex flex-1 items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                        <input type="text" placeholder={t('api.searchPlaceholder')} value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <select value={methodFilter} onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }} className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500 hidden sm:block">
                        <option value="">{t('api.allMethods')}</option>
                        {methods.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500 hidden sm:block">
                        <option value="">{t('api.allCategories')}</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                   <button onClick={fetchApis} className="p-2 text-zinc-500 hover:text-indigo-600 rounded-lg"><RefreshCw size={20} className={loading ? 'animate-spin' : ''} /></button>
                   <button onClick={() => window.open('/api/docs', '_blank')} className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-lg text-sm font-medium transition-colors"><BookOpen size={16} /><span>{t('api.docs')}</span></button>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                        <th className="px-6 py-4 text-xs font-bold uppercase text-zinc-500">{t('api.table.endpoint')}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase text-zinc-500">{t('api.table.summary')}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase text-zinc-500">{t('api.table.category')}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase text-zinc-500">{t('api.table.auth')}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase text-zinc-500 text-right">{t('api.table.action')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {loading ? <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-500"><RefreshCw className="animate-spin mx-auto mb-2" />{t('api.loading')}</td></tr> : filteredApis.length === 0 ? <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-500">{t('api.empty')}</td></tr> : paginatedApis.map((api) => (
                        <tr key={api.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                          <td className="px-6 py-4"><div className="flex items-center gap-3"><MethodBadge method={api.method} /><code className="text-sm font-mono text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">{api.path}</code></div></td>
                          <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-300"><div className="font-medium text-zinc-900 dark:text-white">{api.summary}</div><div className="text-xs text-zinc-400 mt-0.5 truncate max-w-xs">{api.description}</div></td>
                          <td className="px-6 py-4 text-sm text-zinc-500"><span className="px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-medium">{api.category}</span></td>
                          <td className="px-6 py-4 text-sm">{api.authRequired ? <div className="flex items-center gap-1.5 text-zinc-500"><Lock size={14} /><span className="text-xs font-medium">{t('api.table.required')}</span></div> : <div className="flex items-center gap-1.5 text-emerald-600"><Unlock size={14} /><span className="text-xs font-medium">{t('api.table.public')}</span></div>}</td>
                          <td className="px-6 py-4 text-right"><button onClick={() => setSelectedApi(api)} className="p-2 text-zinc-400 hover:text-indigo-600"><Eye size={18} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/50">
                  <span className="text-sm text-zinc-500">{t('common.showing')} {Math.min((page - 1) * pageSize + 1, filteredApis.length)} {t('common.to')} {Math.min(page * pageSize, filteredApis.length)} {t('common.of')} {filteredApis.length} {t('common.results')}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg disabled:opacity-50 hover:bg-white dark:hover:bg-zinc-700 transition-colors flex items-center gap-1"><ChevronLeft size={16} />{t('common.prev')}</button>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} className="px-3 py-1 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg disabled:opacity-50 hover:bg-white dark:hover:bg-zinc-700 transition-colors flex items-center gap-1">{t('common.next')}<ChevronRight size={16} /></button>
                  </div>
                </div>
              </div>
          </TabsContent>

          <TabsContent value="sdks" className="mt-6">
              <ClientSdk t={t} />
          </TabsContent>

          <TabsContent value="webhooks" className="mt-6">
              <WebhookConfig t={t} />
          </TabsContent>
      </Tabs>

      {selectedApi && <ApiDetailModal api={selectedApi} onClose={() => setSelectedApi(null)} authType={getAuthType(selectedApi)} t={t} />}
    </div>
  );
}

const StatCard = ({ icon, label, value, color }: any) => (
    <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 min-w-[140px]">
        <div className={`p-2 bg-${color}-50 dark:bg-${color}-900/20 rounded-lg text-${color}-600 dark:text-${color}-400`}>{icon}</div>
        <div><div className="text-xs text-zinc-500 font-medium">{label}</div><div className={`text-lg font-bold text-${color === 'indigo' ? 'zinc-900 dark:text-white' : color + '-600'}`}>{value}</div></div>
    </div>
);
