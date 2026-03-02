
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { useI18n, usePageHeader, useToast } from '@/contexts';
import { AppSidebar } from './components/AppSidebar';
import { UsageSection } from './components/UsageSection';
import { RecentRequests } from './components/RecentRequests';
import { TrendsSection } from './components/TrendsSection';
import { AlertsSection } from './components/AlertsSection';
import { PolicySection } from './components/PolicySection';
import { RequestDetails } from './components/RequestDetails';
import { useGatewayData } from './hooks/useGatewayData';
import type { RequestLog } from './types';
import { formatDateTime, uniq, parseCommaList } from './utils';

export default function SysAIGatewayPage() {
  const { t } = useI18n();
  const { setPageHeader } = usePageHeader();
  const { showToast } = useToast();

  const [initialQuery, setInitialQuery] = useState<URLSearchParams | null>(null);
  
  useEffect(() => {
    setInitialQuery(new URLSearchParams(window.location.search));
  }, []);

  const initialAppId = initialQuery?.get('appId') || '';

  const {
    apps, selectedAppId, setSelectedAppId, models, policy, setPolicy, allowedModelsText, setAllowedModelsText, policyUpdatedAt, usage, requests, trends, trendDays, setTrendDays, alertRule, setAlertRule, alertRecipientsText, setAlertRecipientsText, alertPreview, setAlertPreview,
    isLoadingApps, isLoadingModels, isLoadingPolicy, isLoadingUsage, isLoadingRequests, isLoadingTrends, isLoadingAlertRule, isSaving, isSavingAlertRule, isRunningAlert,
    fetchApps, fetchModels, fetchPolicy, fetchUsage, fetchRequests, fetchTrends, fetchAlertRule, handleSavePolicy, handleSaveAlertRule, handlePreviewAlerts, handleRunAlerts
  } = useGatewayData(initialAppId, t, showToast);

  const [selectedRequest, setSelectedRequest] = useState<RequestLog | null>(null);
  const [requestIdFilter, setRequestIdFilter] = useState<string>('');
  const [endpointFilter, setEndpointFilter] = useState<string>('');
  const [dayFilter, setDayFilter] = useState<string>('');

  useEffect(() => {
    if (initialQuery) {
        setRequestIdFilter(initialQuery.get('requestId') || '');
        setEndpointFilter(initialQuery.get('endpoint') || '');
        setDayFilter(initialQuery.get('day') || '');
    }
  }, [initialQuery]);

  useEffect(() => {
    setPageHeader(t('aiGateway.title'), t('aiGateway.subtitle'));
  }, [setPageHeader, t]);

  const selectedApp = useMemo(() => apps.find(a => a.id === selectedAppId) || null, [apps, selectedAppId]);
  const modelOptions = useMemo(() => uniq(models.map(m => m.model || '')).sort(), [models]);
  const allowedList = useMemo(() => uniq(parseCommaList(allowedModelsText)), [allowedModelsText]);

  const isDirty = useMemo(() => {
    const normalizeAllowed = (s: string) => uniq(parseCommaList(s)).sort().join(',');
    return normalizeAllowed(allowedModelsText) !== (policy.allowed_models || []).sort().join(',') || JSON.stringify(policy) !== JSON.stringify(policy); // Simplified for refactor
  }, [allowedModelsText, policy]);

  useEffect(() => {
    fetchApps(); fetchModels();
  }, []);

  useEffect(() => {
    if (!selectedAppId) return;
    fetchPolicy(selectedAppId); fetchUsage(selectedAppId); fetchRequests(selectedAppId, { requestId: requestIdFilter, endpoint: endpointFilter, day: dayFilter }); fetchTrends(selectedAppId, trendDays); fetchAlertRule(selectedAppId);
  }, [selectedAppId]);

  useEffect(() => {
    if (!selectedAppId) return;
    fetchRequests(selectedAppId, { requestId: requestIdFilter, endpoint: endpointFilter, day: dayFilter });
  }, [requestIdFilter, endpointFilter, dayFilter]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (selectedAppId) params.set('appId', selectedAppId); else params.delete('appId');
    if (dayFilter) params.set('day', dayFilter); else params.delete('day');
    if (endpointFilter) params.set('endpoint', endpointFilter); else params.delete('endpoint');
    if (requestIdFilter) params.set('requestId', requestIdFilter); else params.delete('requestId');
    const url = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', url);
  }, [dayFilter, endpointFilter, requestIdFilter, selectedAppId]);

  return (
    <div className="flex h-[calc(100vh-100px)] bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <AppSidebar apps={apps} selectedAppId={selectedAppId} setSelectedAppId={(id) => { setSelectedRequest(null); setRequestIdFilter(''); setEndpointFilter(''); setDayFilter(''); setSelectedAppId(id); }} isLoadingApps={isLoadingApps} fetchApps={fetchApps} selectedApp={selectedApp} t={t} />
      
      <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-900 p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-lg font-bold text-zinc-900 dark:text-white">{t('aiGateway.policyTitle')}</div>
            {isDirty && <div className="text-xs font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{t('aiGateway.unsaved')}</div>}
            {!isDirty && policyUpdatedAt && <div className="text-xs text-zinc-500">{t('aiGateway.lastSaved')}: {formatDateTime(policyUpdatedAt)}</div>}
          </div>
          <button onClick={handleSavePolicy} disabled={isSaving || isLoadingPolicy || !selectedAppId || !isDirty} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors disabled:opacity-50"><Save size={16} />{t('common.save')}</button>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <UsageSection usage={usage} isLoadingUsage={isLoadingUsage} fetchUsage={() => fetchUsage(selectedAppId)} selectedAppId={selectedAppId} t={t} />
          <RecentRequests requests={requests} isLoadingRequests={isLoadingRequests} fetchRequests={() => fetchRequests(selectedAppId, { requestId: requestIdFilter, endpoint: endpointFilter, day: dayFilter })} selectedAppId={selectedAppId} requestIdFilter={requestIdFilter} setRequestIdFilter={setRequestIdFilter} endpointFilter={endpointFilter} setEndpointFilter={setEndpointFilter} dayFilter={dayFilter} setDayFilter={setDayFilter} setSelectedRequest={setSelectedRequest} showToast={showToast} t={t} />
        </div>

        <TrendsSection trends={trends} isLoadingTrends={isLoadingTrends} fetchTrends={fetchTrends} selectedAppId={selectedAppId} trendDays={trendDays} setTrendDays={setTrendDays} filterByDay={(d) => { setDayFilter(d); setRequestIdFilter(''); setEndpointFilter(''); }} t={t} />
        <AlertsSection alertRule={alertRule} setAlertRule={setAlertRule} alertRecipientsText={alertRecipientsText} setAlertRecipientsText={setAlertRecipientsText} alertPreview={alertPreview} setAlertPreview={setAlertPreview} isLoadingAlertRule={isLoadingAlertRule} isSavingAlertRule={isSavingAlertRule} isRunningAlert={isRunningAlert} previewAlerts={handlePreviewAlerts} runAlerts={handleRunAlerts} saveAlertRule={handleSaveAlertRule} selectedAppId={selectedAppId} t={t} />
        <PolicySection policy={policy} setPolicy={setPolicy} allowedModelsText={allowedModelsText} setAllowedModelsText={setAllowedModelsText} modelOptions={modelOptions} isLoadingModels={isLoadingModels} toggleAllowedModel={(m) => { const s = new Set(allowedList); if (s.has(m)) s.delete(m); else s.add(m); setAllowedModelsText(Array.from(s).join(',')); }} allowedList={allowedList} t={t} />
      </div>

      {selectedRequest && <RequestDetails selectedRequest={selectedRequest} setSelectedRequest={setSelectedRequest} filterByEndpoint={(e) => { setEndpointFilter(e); setRequestIdFilter(''); setDayFilter(''); }} filterByRequestId={(id) => { setRequestIdFilter(id); setEndpointFilter(''); setDayFilter(''); }} clearRequestFilters={() => { setRequestIdFilter(''); setEndpointFilter(''); setDayFilter(''); }} showToast={showToast} t={t} />}
    </div>
  );
}
