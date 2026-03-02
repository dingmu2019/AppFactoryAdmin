
import { useState } from 'react';
import { authenticatedFetch } from '../../../../lib/http';
import type { SaaSAppLite, ModelOption, GatewayPolicy, UsageToday, RequestLog, TrendPoint, AlertRule, AlertPreview } from '../types';
import { parseCommaList } from '../utils';

const emptyPolicy: GatewayPolicy = {
  id: '',
  app_id: '',
  name: '',
  type: 'rate_limit',
  config: {},
  is_enabled: false,
  default_model: null,
  allowed_models: null,
  allow_tools: false,
  allow_content_logging: false,
  max_input_tokens: null,
  max_output_tokens: null,
  daily_token_limit: null,
  daily_request_limit: null
};

const emptyUsage: UsageToday = {
  total_tokens: 0,
  request_count: 0,
  daily_token_limit: null,
  daily_request_limit: null,
  total_requests: 0,
  error_rate: 0,
  avg_latency: 0
};

const emptyAlertRule: AlertRule = {
  id: '',
  name: '',
  metric: 'error_rate',
  threshold: 0,
  window: '1h',
  is_enabled: false,
  token_usage_threshold: 0.8,
  request_usage_threshold: 0.8,
  error_rate_threshold: 0.05,
  p95_latency_threshold_ms: 2000,
  window_minutes: 60,
  cooldown_minutes: 60,
  recipients: []
};

export const useGatewayData = (initialAppId: string, t: any, showToast: any) => {
  const [apps, setApps] = useState<SaaSAppLite[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [models, setModels] = useState<ModelOption[]>([]);
  const [policy, setPolicy] = useState<GatewayPolicy>(emptyPolicy);
  const [allowedModelsText, setAllowedModelsText] = useState('');
  // const [baselinePolicy, setBaselinePolicy] = useState<GatewayPolicy>(emptyPolicy);
  // const [baselineAllowedModelsText, setBaselineAllowedModelsText] = useState('');
  const [policyUpdatedAt, setPolicyUpdatedAt] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageToday>(emptyUsage);
  const [requests, setRequests] = useState<RequestLog[]>([]);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [trendDays, setTrendDays] = useState<7 | 30>(7);
  const [alertRule, setAlertRule] = useState<AlertRule>(emptyAlertRule);
  const [alertRecipientsText, setAlertRecipientsText] = useState('');
  const [alertPreview, setAlertPreview] = useState<AlertPreview | null>(null);

  const [isLoadingApps, setIsLoadingApps] = useState(true);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isLoadingPolicy, setIsLoadingPolicy] = useState(false);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);
  const [isLoadingAlertRule, setIsLoadingAlertRule] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAlertRule, setIsSavingAlertRule] = useState(false);
  const [isRunningAlert, setIsRunningAlert] = useState(false);

  const fetchApps = async () => {
    setIsLoadingApps(true);
    try {
      const res = await authenticatedFetch('/api/admin/apps', { method: 'GET' });
      if (!res.ok) throw new Error(t('common.error'));
      const data = await res.json();
      const list = Array.isArray(data) ? data.map((a: any) => ({ id: a.id, name: a.name, status: a.status, config: a.config || {} })) : [];
      setApps(list);
      if (!selectedAppId && list.length > 0) {
        const fromQuery = initialAppId && list.some(a => a.id === initialAppId) ? initialAppId : '';
        setSelectedAppId(fromQuery || list[0].id);
      }
    } catch (e: any) { showToast(e.message || t('common.error'), 'error'); } finally { setIsLoadingApps(false); }
  };

  const fetchModels = async () => {
    setIsLoadingModels(true);
    try {
      const res = await authenticatedFetch('/api/admin/ai-gateway/models', { method: 'GET' });
      if (!res.ok) throw new Error(t('common.error'));
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      setModels(list.map((m: any) => ({ id: String(m.id || ''), provider: String(m.provider || 'openai'), model: String(m.model || ''), baseUrl: m.baseUrl })).filter((m: any) => Boolean(m.model)));
    } catch { setModels([]); } finally { setIsLoadingModels(false); }
  };

  const fetchPolicy = async (appId: string) => {
    if (!appId) return;
    setIsLoadingPolicy(true);
    try {
      const res = await authenticatedFetch(`/api/admin/ai-gateway/policies?appId=${encodeURIComponent(appId)}`, { method: 'GET' });
      const json = await res.json();
      const row = (json?.data && Array.isArray(json.data) && json.data.length > 0) ? json.data[0] : null;
      const next: GatewayPolicy = {
        id: row?.id ?? '',
        app_id: row?.app_id ?? appId,
        name: row?.name ?? 'Default Policy',
        type: row?.type ?? 'rate_limit',
        config: row?.config ?? {},
        is_enabled: row?.is_enabled ?? true,
        default_model: row?.default_model ?? null,
        allowed_models: row?.allowed_models ?? null,
        allow_tools: Boolean(row?.allow_tools),
        allow_content_logging: Boolean(row?.allow_content_logging),
        max_input_tokens: row?.max_input_tokens ?? null,
        max_output_tokens: row?.max_output_tokens ?? null,
        daily_token_limit: row?.daily_token_limit ?? null,
        daily_request_limit: row?.daily_request_limit ?? null
      };
      setPolicy(next);
      const text = Array.isArray(next.allowed_models) ? next.allowed_models.join(',') : '';
      setAllowedModelsText(text);
      // setBaselinePolicy(next);
      // setBaselineAllowedModelsText(text);
      setPolicyUpdatedAt(row?.updated_at ?? null);
    } catch {
      setPolicy(emptyPolicy); setAllowedModelsText(''); // setBaselinePolicy(emptyPolicy); setBaselineAllowedModelsText(''); 
      setPolicyUpdatedAt(null);
    } finally { setIsLoadingPolicy(false); }
  };

  const fetchUsage = async (appId: string) => {
    if (!appId) return;
    setIsLoadingUsage(true);
    try {
      const res = await authenticatedFetch(`/api/admin/ai-gateway/usage/today?appId=${encodeURIComponent(appId)}`, { method: 'GET' });
      const json = await res.json();
      const d = json?.data || {};
      setUsage({ total_tokens: Number(d.total_tokens || 0), request_count: Number(d.request_count || 0), daily_token_limit: d.daily_token_limit ?? null, daily_request_limit: d.daily_request_limit ?? null, total_requests: Number(d.request_count || 0), error_rate: 0, avg_latency: 0 });
    } catch { setUsage(emptyUsage); } finally { setIsLoadingUsage(false); }
  };

  const fetchRequests = async (appId: string, filters: any) => {
    if (!appId) return;
    setIsLoadingRequests(true);
    try {
      const params = new URLSearchParams();
      params.set('appId', appId); params.set('limit', '50');
      if (filters.requestId) params.set('requestId', filters.requestId);
      if (filters.endpoint) params.set('endpoint', filters.endpoint);
      if (filters.day) params.set('day', filters.day);
      const res = await authenticatedFetch(`/api/admin/ai-gateway/requests?${params.toString()}`, { method: 'GET' });
      const json = await res.json();
      setRequests(Array.isArray(json?.data) ? json.data : []);
    } catch { setRequests([]); } finally { setIsLoadingRequests(false); }
  };

  const fetchTrends = async (appId: string, days: 7 | 30) => {
    if (!appId) return;
    setIsLoadingTrends(true);
    try {
      const res = await authenticatedFetch(`/api/admin/ai-gateway/usage/trends?appId=${encodeURIComponent(appId)}&days=${days}`, { method: 'GET' });
      const json = await res.json();
      setTrends((json?.data || []).map((r: any) => ({ day: String(r.day), total_tokens: Number(r.total_tokens || 0), request_count: Number(r.request_count || 0), error_rate: Number(r.error_rate || 0), p95_latency_ms: Number(r.p95_latency_ms || 0) })));
    } catch { setTrends([]); } finally { setIsLoadingTrends(false); }
  };

  const fetchAlertRule = async (appId: string) => {
    if (!appId) return;
    setIsLoadingAlertRule(true);
    try {
      const res = await authenticatedFetch(`/api/admin/ai-gateway/alerts/rule?appId=${encodeURIComponent(appId)}`, { method: 'GET' });
      const json = await res.json();
      const d = json?.data || {};
      const next: AlertRule = { 
        id: d.id ?? '',
        name: d.name ?? 'Default Rule',
        metric: d.metric ?? 'error_rate',
        threshold: d.threshold ?? 0,
        window: d.window ?? '1h',
        is_enabled: Boolean(d.is_enabled), 
        token_usage_threshold: Number(d.token_usage_threshold ?? 0.8), request_usage_threshold: Number(d.request_usage_threshold ?? 0.8), error_rate_threshold: Number(d.error_rate_threshold ?? 0.05), p95_latency_threshold_ms: Number(d.p95_latency_threshold_ms ?? 2000), window_minutes: Number(d.window_minutes ?? 60), cooldown_minutes: Number(d.cooldown_minutes ?? 60), recipients: Array.isArray(d.recipients) ? d.recipients : [], updated_at: d.updated_at ?? null };
      setAlertRule(next); setAlertRecipientsText((next.recipients || []).join(',')); setAlertPreview(null);
    } catch { setAlertRule(emptyAlertRule); setAlertRecipientsText(''); setAlertPreview(null); } finally { setIsLoadingAlertRule(false); }
  };

  const handleSavePolicy = async () => {
    if (!selectedAppId) return;
    setIsSaving(true);
    try {
      const payload = { ...policy, allowed_models: allowedModelsText.trim() ? parseCommaList(allowedModelsText) : null };
      const res = await authenticatedFetch(`/api/admin/ai-gateway/policies/${encodeURIComponent(selectedAppId)}`, { method: 'PUT', body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(t('common.error'));
      showToast(t('common.success'), 'success');
      await fetchPolicy(selectedAppId); await fetchUsage(selectedAppId);
    } catch (e: any) { showToast(e.message || t('common.error'), 'error'); } finally { setIsSaving(false); }
  };

  const handleSaveAlertRule = async () => {
    if (!selectedAppId) return;
    setIsSavingAlertRule(true);
    try {
      const res = await authenticatedFetch(`/api/admin/ai-gateway/alerts/rule/${encodeURIComponent(selectedAppId)}`, { method: 'PUT', body: JSON.stringify({ ...alertRule, recipients_text: alertRecipientsText }) });
      if (!res.ok) throw new Error(t('common.error'));
      const json = await res.json();
      setAlertRule(prev => ({ ...prev, updated_at: json?.data?.updated_at ?? prev.updated_at }));
      showToast(t('common.success'), 'success');
    } catch (e: any) { showToast(e.message || t('common.error'), 'error'); } finally { setIsSavingAlertRule(false); }
  };

  const handlePreviewAlerts = async () => {
    if (!selectedAppId) return;
    setIsRunningAlert(true);
    try {
      const res = await authenticatedFetch(`/api/admin/ai-gateway/alerts/preview?appId=${encodeURIComponent(selectedAppId)}`, { method: 'GET' });
      const json = await res.json();
      setAlertPreview(json?.data || null);
    } catch (e: any) { showToast(e.message || t('common.error'), 'error'); } finally { setIsRunningAlert(false); }
  };

  const handleRunAlerts = async (dryRun: boolean) => {
    if (!selectedAppId) return;
    setIsRunningAlert(true);
    try {
      const res = await authenticatedFetch(`/api/admin/ai-gateway/alerts/run?appId=${encodeURIComponent(selectedAppId)}&dryRun=${dryRun ? '1' : '0'}`, { method: 'POST' });
      const json = await res.json();
      showToast(`${t('common.success')} (${json?.notificationsEnqueued || 0})`, 'success');
    } catch (e: any) { showToast(e.message || t('common.error'), 'error'); } finally { setIsRunningAlert(false); }
  };

  return {
    apps, selectedAppId, setSelectedAppId, models, policy, setPolicy, allowedModelsText, setAllowedModelsText, policyUpdatedAt, usage, requests, trends, trendDays, setTrendDays, alertRule, setAlertRule, alertRecipientsText, setAlertRecipientsText, alertPreview, setAlertPreview,
    isLoadingApps, isLoadingModels, isLoadingPolicy, isLoadingUsage, isLoadingRequests, isLoadingTrends, isLoadingAlertRule, isSaving, isSavingAlertRule, isRunningAlert,
    fetchApps, fetchModels, fetchPolicy, fetchUsage, fetchRequests, fetchTrends, fetchAlertRule, handleSavePolicy, handleSaveAlertRule, handlePreviewAlerts, handleRunAlerts
  };
};
