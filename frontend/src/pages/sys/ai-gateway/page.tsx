import { useEffect, useMemo, useState } from 'react';
import { Bot, Save, RefreshCw, Activity, ListChecks, X, Copy } from 'lucide-react';
import { useI18n, usePageHeader, useToast } from '../../../contexts';
import { authenticatedFetch } from '../../../lib/http';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts';

type SaaSAppLite = {
  id: string;
  name: string;
  status?: string;
};

type GatewayPolicy = {
  default_model: string | null;
  allowed_models: string[] | null;
  allow_tools: boolean;
  allow_content_logging: boolean;
  max_input_tokens: number | null;
  max_output_tokens: number | null;
  daily_token_limit: number | null;
  daily_request_limit: number | null;
};

type ModelOption = {
  id: string;
  provider: string;
  model: string;
  baseUrl?: string;
};

type UsageToday = {
  total_tokens: number;
  request_count: number;
  daily_token_limit: number | null;
  daily_request_limit: number | null;
};

type RequestLog = {
  id: string;
  request_id: string;
  endpoint: string;
  provider: string | null;
  model: string | null;
  status_code: number;
  latency_ms: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  error_message: string | null;
  created_at: string;
};

type TrendPoint = {
  day: string;
  total_tokens: number;
  request_count: number;
  error_rate: number;
  p95_latency_ms: number;
};

type AlertRule = {
  is_enabled: boolean;
  token_usage_threshold: number;
  request_usage_threshold: number;
  error_rate_threshold: number;
  p95_latency_threshold_ms: number;
  window_minutes: number;
  cooldown_minutes: number;
  recipients: string[];
  updated_at?: string | null;
};

type AlertPreview = {
  rule: AlertRule;
  usage: {
    total_tokens: number;
    request_count: number;
    daily_token_limit: number | null;
    daily_request_limit: number | null;
  };
  window: {
    request_count: number;
    error_count: number;
    error_rate: number;
    p95_latency_ms: number;
    total_tokens: number;
  };
  ratios: {
    tokenRatio: number | null;
    requestRatio: number | null;
  };
  breaches: {
    token: boolean;
    request: boolean;
    error_rate: boolean;
    p95_latency: boolean;
  };
};

const emptyPolicy: GatewayPolicy = {
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
  daily_request_limit: null
};

const emptyAlertRule: AlertRule = {
  is_enabled: false,
  token_usage_threshold: 0.8,
  request_usage_threshold: 0.8,
  error_rate_threshold: 0.05,
  p95_latency_threshold_ms: 2000,
  window_minutes: 60,
  cooldown_minutes: 60,
  recipients: []
};

const parseCommaList = (value: string) =>
  value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

const toNumberOrNull = (value: string) => {
  if (!value.trim()) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return n;
};

const uniq = (arr: string[]) => Array.from(new Set(arr));

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
};

const formatNumber = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(Number(value))) return '-';
  return Number(value).toLocaleString();
};

const formatPct = (value: number | null | undefined) => {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return '-';
  return `${(n * 100).toFixed(1)}%`;
};

const progressPct = (used: number, limit: number | null) => {
  if (!limit || limit <= 0) return 0;
  const pct = Math.floor((used / limit) * 100);
  return Math.max(0, Math.min(100, pct));
};

const copyToClipboard = async (text: string) => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export default function SysAIGatewayPage() {
  const { t } = useI18n();
  const { setPageHeader } = usePageHeader();
  const { showToast } = useToast();

  const [initialQuery] = useState(() => new URLSearchParams(window.location.search));
  const initialAppId = initialQuery.get('appId') || '';

  const [apps, setApps] = useState<SaaSAppLite[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>('');

  const [models, setModels] = useState<ModelOption[]>([]);
  const [policy, setPolicy] = useState<GatewayPolicy>(emptyPolicy);
  const [allowedModelsText, setAllowedModelsText] = useState('');
  const [baselinePolicy, setBaselinePolicy] = useState<GatewayPolicy>(emptyPolicy);
  const [baselineAllowedModelsText, setBaselineAllowedModelsText] = useState('');
  const [policyUpdatedAt, setPolicyUpdatedAt] = useState<string | null>(null);

  const [usage, setUsage] = useState<UsageToday>(emptyUsage);
  const [requests, setRequests] = useState<RequestLog[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RequestLog | null>(null);

  const [requestIdFilter, setRequestIdFilter] = useState<string>(() => initialQuery.get('requestId') || '');
  const [endpointFilter, setEndpointFilter] = useState<string>(() => initialQuery.get('endpoint') || '');
  const [dayFilter, setDayFilter] = useState<string>(() => initialQuery.get('day') || '');

  const [trendDays, setTrendDays] = useState<7 | 30>(7);
  const [trends, setTrends] = useState<TrendPoint[]>([]);

  const [alertRule, setAlertRule] = useState<AlertRule>(emptyAlertRule);
  const [alertRecipientsText, setAlertRecipientsText] = useState('');
  const [alertPreview, setAlertPreview] = useState<AlertPreview | null>(null);
  const [isLoadingAlertRule, setIsLoadingAlertRule] = useState(false);
  const [isSavingAlertRule, setIsSavingAlertRule] = useState(false);
  const [isRunningAlert, setIsRunningAlert] = useState(false);

  const [isLoadingApps, setIsLoadingApps] = useState(true);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isLoadingPolicy, setIsLoadingPolicy] = useState(false);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setPageHeader(t('aiGateway.title'), t('aiGateway.subtitle'));
  }, [setPageHeader, t]);

  const selectedApp = useMemo(() => apps.find(a => a.id === selectedAppId) || null, [apps, selectedAppId]);
  const modelOptions = useMemo(() => uniq(models.map(m => m.model)).sort(), [models]);

  const isDirty = useMemo(() => {
    const normalizeAllowed = (s: string) => uniq(parseCommaList(s)).sort().join(',');
    const a = normalizeAllowed(allowedModelsText);
    const b = normalizeAllowed(baselineAllowedModelsText);
    if (a !== b) return true;
    return JSON.stringify(policy) !== JSON.stringify(baselinePolicy);
  }, [allowedModelsText, baselineAllowedModelsText, policy, baselinePolicy]);

  const allowedList = useMemo(() => uniq(parseCommaList(allowedModelsText)), [allowedModelsText]);

  const fetchApps = async () => {
    setIsLoadingApps(true);
    try {
      const res = await authenticatedFetch('/api/admin/apps', { method: 'GET' });
      if (!res.ok) throw new Error('Failed to load apps');
      const data = await res.json();
      const list = Array.isArray(data)
        ? data.map((a: any) => ({ id: a.id, name: a.name, status: a.status }))
        : [];
      setApps(list);
      if (!selectedAppId && list.length > 0) {
        const fromQuery = initialAppId && list.some(a => a.id === initialAppId) ? initialAppId : '';
        setSelectedAppId(fromQuery || list[0].id);
      }
    } catch (e: any) {
      showToast(e.message || t('common.error'), 'error');
    } finally {
      setIsLoadingApps(false);
    }
  };

  const fetchModels = async () => {
    setIsLoadingModels(true);
    try {
      const res = await authenticatedFetch('/api/admin/ai-gateway/models', { method: 'GET' });
      if (!res.ok) throw new Error('Failed to load models');
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      const mapped: ModelOption[] = list
        .map((m: any) => ({
          id: String(m.id || ''),
          provider: String(m.provider || 'openai'),
          model: String(m.model || ''),
          baseUrl: m.baseUrl
        }))
        .filter((m: any) => Boolean(m.model));
      setModels(mapped);
    } catch (e: any) {
      setModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const fetchPolicy = async (appId: string) => {
    if (!appId) return;
    setIsLoadingPolicy(true);
    try {
      const res = await authenticatedFetch(`/api/admin/ai-gateway/policies?appId=${encodeURIComponent(appId)}`, { method: 'GET' });
      if (!res.ok) throw new Error('Failed to load policy');
      const json = await res.json();
      const row = (json?.data && Array.isArray(json.data) && json.data.length > 0) ? json.data[0] : null;
      const next: GatewayPolicy = {
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
      setBaselinePolicy(next);
      setBaselineAllowedModelsText(text);
      setPolicyUpdatedAt(row?.updated_at ?? null);
    } catch (e: any) {
      showToast(e.message || t('common.error'), 'error');
      setPolicy(emptyPolicy);
      setAllowedModelsText('');
      setBaselinePolicy(emptyPolicy);
      setBaselineAllowedModelsText('');
      setPolicyUpdatedAt(null);
    } finally {
      setIsLoadingPolicy(false);
    }
  };

  const fetchUsage = async (appId: string) => {
    if (!appId) return;
    setIsLoadingUsage(true);
    try {
      const res = await authenticatedFetch(`/api/admin/ai-gateway/usage/today?appId=${encodeURIComponent(appId)}`, { method: 'GET' });
      if (!res.ok) throw new Error('Failed to load usage');
      const json = await res.json();
      const d = json?.data || {};
      setUsage({
        total_tokens: Number(d.total_tokens || 0),
        request_count: Number(d.request_count || 0),
        daily_token_limit: d.daily_token_limit ?? null,
        daily_request_limit: d.daily_request_limit ?? null
      });
    } catch {
      setUsage(emptyUsage);
    } finally {
      setIsLoadingUsage(false);
    }
  };

  const fetchRequests = async (appId: string) => {
    if (!appId) return;
    setIsLoadingRequests(true);
    try {
      const params = new URLSearchParams();
      params.set('appId', appId);
      params.set('limit', '50');
      if (requestIdFilter) params.set('requestId', requestIdFilter);
      if (endpointFilter) params.set('endpoint', endpointFilter);
      if (dayFilter) params.set('day', dayFilter);

      const res = await authenticatedFetch(`/api/admin/ai-gateway/requests?${params.toString()}`, { method: 'GET' });
      if (!res.ok) throw new Error('Failed to load requests');
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      setRequests(list);
    } catch {
      setRequests([]);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const fetchTrends = async (appId: string, days: 7 | 30) => {
    if (!appId) return;
    setIsLoadingTrends(true);
    try {
      const res = await authenticatedFetch(`/api/admin/ai-gateway/usage/trends?appId=${encodeURIComponent(appId)}&days=${days}`, { method: 'GET' });
      if (!res.ok) throw new Error('Failed to load trends');
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      const mapped: TrendPoint[] = list.map((r: any) => ({
        day: String(r.day),
        total_tokens: Number(r.total_tokens || 0),
        request_count: Number(r.request_count || 0),
        error_rate: Number(r.error_rate || 0),
        p95_latency_ms: Number(r.p95_latency_ms || 0)
      }));
      setTrends(mapped);
    } catch {
      setTrends([]);
    } finally {
      setIsLoadingTrends(false);
    }
  };

  const fetchAlertRule = async (appId: string) => {
    if (!appId) return;
    setIsLoadingAlertRule(true);
    try {
      const res = await authenticatedFetch(`/api/admin/ai-gateway/alerts/rule?appId=${encodeURIComponent(appId)}`, { method: 'GET' });
      if (!res.ok) throw new Error('Failed to load alert rule');
      const json = await res.json();
      const d = json?.data || {};
      const next: AlertRule = {
        is_enabled: Boolean(d.is_enabled),
        token_usage_threshold: Number(d.token_usage_threshold ?? 0.8),
        request_usage_threshold: Number(d.request_usage_threshold ?? 0.8),
        error_rate_threshold: Number(d.error_rate_threshold ?? 0.05),
        p95_latency_threshold_ms: Number(d.p95_latency_threshold_ms ?? 2000),
        window_minutes: Number(d.window_minutes ?? 60),
        cooldown_minutes: Number(d.cooldown_minutes ?? 60),
        recipients: Array.isArray(d.recipients) ? d.recipients : [],
        updated_at: d.updated_at ?? null
      };
      setAlertRule(next);
      setAlertRecipientsText((next.recipients || []).join(','));
      setAlertPreview(null);
    } catch {
      setAlertRule(emptyAlertRule);
      setAlertRecipientsText('');
      setAlertPreview(null);
    } finally {
      setIsLoadingAlertRule(false);
    }
  };

  const saveAlertRule = async () => {
    if (!selectedAppId) return;
    setIsSavingAlertRule(true);
    try {
      const payload = {
        ...alertRule,
        recipients_text: alertRecipientsText
      };
      const res = await authenticatedFetch(`/api/admin/ai-gateway/alerts/rule/${encodeURIComponent(selectedAppId)}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Failed to save alert rule');
      }
      const json = await res.json();
      const d = json?.data || {};
      setAlertRule(prev => ({ ...prev, updated_at: d.updated_at ?? prev.updated_at }));
      showToast(t('common.success'), 'success');
    } catch (e: any) {
      showToast(e.message || t('common.error'), 'error');
    } finally {
      setIsSavingAlertRule(false);
    }
  };

  const previewAlerts = async () => {
    if (!selectedAppId) return;
    setIsRunningAlert(true);
    try {
      const res = await authenticatedFetch(`/api/admin/ai-gateway/alerts/preview?appId=${encodeURIComponent(selectedAppId)}`, { method: 'GET' });
      if (!res.ok) throw new Error('Failed to preview alerts');
      const json = await res.json();
      setAlertPreview(json?.data || null);
    } catch (e: any) {
      showToast(e.message || t('common.error'), 'error');
    } finally {
      setIsRunningAlert(false);
    }
  };

  const runAlerts = async (dryRun: boolean) => {
    if (!selectedAppId) return;
    setIsRunningAlert(true);
    try {
      const res = await authenticatedFetch(`/api/admin/ai-gateway/alerts/run?appId=${encodeURIComponent(selectedAppId)}&dryRun=${dryRun ? '1' : '0'}`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to run alerts');
      const json = await res.json();
      showToast(`${t('common.success')} (${json?.notificationsEnqueued || 0})`, 'success');
    } catch (e: any) {
      showToast(e.message || t('common.error'), 'error');
    } finally {
      setIsRunningAlert(false);
    }
  };

  useEffect(() => {
    fetchApps();
    fetchModels();
  }, []);

  useEffect(() => {
    if (!selectedAppId) return;
    fetchPolicy(selectedAppId);
    fetchUsage(selectedAppId);
    fetchRequests(selectedAppId);
    fetchTrends(selectedAppId, trendDays);
    fetchAlertRule(selectedAppId);
  }, [selectedAppId]);

  useEffect(() => {
    if (!selectedAppId) return;
    fetchRequests(selectedAppId);
  }, [requestIdFilter, endpointFilter, dayFilter]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (selectedAppId) params.set('appId', selectedAppId);
    else params.delete('appId');
    if (dayFilter) params.set('day', dayFilter);
    else params.delete('day');
    if (endpointFilter) params.set('endpoint', endpointFilter);
    else params.delete('endpoint');
    if (requestIdFilter) params.set('requestId', requestIdFilter);
    else params.delete('requestId');
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState({}, '', url);
  }, [dayFilter, endpointFilter, requestIdFilter, selectedAppId]);

  useEffect(() => {
    if (!selectedAppId) return;
    fetchTrends(selectedAppId, trendDays);
  }, [trendDays]);

  const handleSave = async () => {
    if (!selectedAppId) return;
    setIsSaving(true);
    try {
      const payload = {
        ...policy,
        allowed_models: allowedModelsText.trim() ? parseCommaList(allowedModelsText) : null
      };
      const res = await authenticatedFetch(`/api/admin/ai-gateway/policies/${encodeURIComponent(selectedAppId)}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Failed to save policy');
      }
      showToast(t('common.success'), 'success');
      await fetchPolicy(selectedAppId);
      await fetchUsage(selectedAppId);
    } catch (e: any) {
      showToast(e.message || t('common.error'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAllowedModel = (model: string) => {
    const set = new Set(allowedList);
    if (set.has(model)) set.delete(model);
    else set.add(model);
    setAllowedModelsText(Array.from(set).join(','));
  };

  const tokensPct = progressPct(usage.total_tokens, usage.daily_token_limit);
  const reqPct = progressPct(usage.request_count, usage.daily_request_limit);
  const nearLimit = (usage.daily_token_limit && tokensPct >= 80) || (usage.daily_request_limit && reqPct >= 80);

  const trendTokens = useMemo(() => trends.map(p => ({ day: p.day, tokens: p.total_tokens })), [trends]);
  const trendQuality = useMemo(
    () => trends.map(p => ({ day: p.day, errorPct: p.error_rate * 100, p95: p.p95_latency_ms })),
    [trends]
  );
  const trendSummary = useMemo(() => {
    const totalTokens = trends.reduce((sum, p) => sum + (p.total_tokens || 0), 0);
    const totalReq = trends.reduce((sum, p) => sum + (p.request_count || 0), 0);
    const totalErr = trends.reduce((sum, p) => sum + Math.round((p.request_count || 0) * (p.error_rate || 0)), 0);
    const errorRate = totalReq > 0 ? totalErr / totalReq : 0;
    const p95Avg = trends.length > 0 ? trends.reduce((sum, p) => sum + (p.p95_latency_ms || 0), 0) / trends.length : 0;
    return { totalTokens, totalReq, errorRate, p95Avg };
  }, [trends]);

  const hasRequestFilters = Boolean(requestIdFilter || endpointFilter || dayFilter);

  const clearRequestFilters = () => {
    setRequestIdFilter('');
    setEndpointFilter('');
    setDayFilter('');
  };

  const filterByRequestId = (requestId: string) => {
    setRequestIdFilter(requestId);
    setEndpointFilter('');
    setDayFilter('');
  };

  const filterByEndpoint = (endpoint: string) => {
    setEndpointFilter(endpoint);
    setRequestIdFilter('');
    setDayFilter('');
  };

  const filterByDay = (day: string) => {
    setDayFilter(day);
    setRequestIdFilter('');
    setEndpointFilter('');
  };

  return (
    <div className="flex h-[calc(100vh-100px)] bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="w-80 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
            <Bot size={18} />
            {t('aiGateway.appSelect')}
          </div>
          <button
            onClick={fetchApps}
            className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 transition-colors"
            title={t('common.refresh')}
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {isLoadingApps ? (
          <div className="text-sm text-slate-500">{t('common.loading')}</div>
        ) : (
          <select
            value={selectedAppId}
            onChange={(e) => {
              setSelectedRequest(null);
              clearRequestFilters();
              setSelectedAppId(e.target.value);
            }}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {apps.map(a => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        )}

        {selectedApp && (
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="text-xs text-slate-500">{t('aiGateway.appId')}</div>
            <div className="text-sm font-mono text-slate-800 dark:text-slate-100 break-all mt-1">{selectedApp.id}</div>
            {selectedApp.status && (
              <div className="text-xs text-slate-500 mt-2">{t('aiGateway.appStatus')}: {selectedApp.status}</div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-lg font-bold text-slate-900 dark:text-white">{t('aiGateway.policyTitle')}</div>
            {isDirty && (
              <div className="text-xs font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                {t('aiGateway.unsaved')}
              </div>
            )}
            {!isDirty && policyUpdatedAt && (
              <div className="text-xs text-slate-500">
                {t('aiGateway.lastSaved')}: {formatDateTime(policyUpdatedAt)}
              </div>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoadingPolicy || !selectedAppId || !isDirty}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            {t('common.save')}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={`p-4 rounded-2xl border ${nearLimit ? 'border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                <Activity size={16} />
                {t('aiGateway.usageToday')}
              </div>
              <button
                onClick={() => selectedAppId && fetchUsage(selectedAppId)}
                className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                title={t('common.refresh')}
                disabled={!selectedAppId || isLoadingUsage}
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {isLoadingUsage ? (
              <div className="mt-3 text-sm text-slate-500">{t('common.loading')}</div>
            ) : (
              <div className="mt-3 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{t('aiGateway.tokensUsed')}</span>
                    <span>
                      {formatNumber(usage.total_tokens)} / {usage.daily_token_limit ? formatNumber(usage.daily_token_limit) : t('aiGateway.unlimited')}
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${tokensPct >= 90 ? 'bg-rose-500' : tokensPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${tokensPct}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{t('aiGateway.requestsUsed')}</span>
                    <span>
                      {formatNumber(usage.request_count)} / {usage.daily_request_limit ? formatNumber(usage.daily_request_limit) : t('aiGateway.unlimited')}
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${reqPct >= 90 ? 'bg-rose-500' : reqPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${reqPct}%` }}
                    />
                  </div>
                </div>

                {nearLimit && (
                  <div className="text-xs text-amber-700 dark:text-amber-300">
                    {t('aiGateway.nearQuota')}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                <ListChecks size={16} />
                {t('aiGateway.recentRequests')}
              </div>
              <button
                onClick={() => selectedAppId && fetchRequests(selectedAppId)}
                className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                title={t('common.refresh')}
                disabled={!selectedAppId || isLoadingRequests}
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {hasRequestFilters && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="text-xs text-slate-500">{t('aiGateway.filters')}</div>
                {dayFilter && (
                  <button
                    type="button"
                    onClick={() => setDayFilter('')}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
                    title={t('aiGateway.clearOne')}
                  >
                    {t('aiGateway.filterDay')}: {dayFilter}
                    <X size={14} />
                  </button>
                )}
                {endpointFilter && (
                  <button
                    type="button"
                    onClick={() => setEndpointFilter('')}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
                    title={t('aiGateway.clearOne')}
                  >
                    {t('aiGateway.filterEndpoint')}: {endpointFilter}
                    <X size={14} />
                  </button>
                )}
                {requestIdFilter && (
                  <button
                    type="button"
                    onClick={() => setRequestIdFilter('')}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
                    title={t('aiGateway.clearOne')}
                  >
                    {t('aiGateway.filterRequestId')}: {requestIdFilter}
                    <X size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearRequestFilters}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                >
                  {t('aiGateway.clearFilters')}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await copyToClipboard(window.location.href);
                    if (ok) showToast(t('aiGateway.linkCopied'), 'success');
                  }}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                >
                  {t('aiGateway.copyLink')}
                </button>
              </div>
            )}

            {isLoadingRequests ? (
              <div className="mt-3 text-sm text-slate-500">{t('common.loading')}</div>
            ) : requests.length === 0 ? (
              <div className="mt-3 text-sm text-slate-500">{hasRequestFilters ? t('aiGateway.noFilteredRequests') : t('aiGateway.noRequests')}</div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500">
                      <th className="text-left font-semibold py-2 pr-4">{t('aiGateway.time')}</th>
                      <th className="text-left font-semibold py-2 pr-4">{t('aiGateway.modelCol')}</th>
                      <th className="text-left font-semibold py-2 pr-4">{t('aiGateway.tokensCol')}</th>
                      <th className="text-left font-semibold py-2 pr-4">{t('aiGateway.latencyCol')}</th>
                      <th className="text-left font-semibold py-2 pr-4">{t('aiGateway.statusCol')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.slice(0, 8).map(r => {
                      const bad = r.status_code >= 400;
                      return (
                        <tr
                          key={r.id}
                          className="border-t border-slate-200/60 dark:border-slate-800/60 hover:bg-white/60 dark:hover:bg-slate-900/40 cursor-pointer"
                          onClick={() => setSelectedRequest(r)}
                        >
                          <td className="py-2 pr-4 text-slate-700 dark:text-slate-200 whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                          <td className="py-2 pr-4">
                            <div className="text-slate-800 dark:text-slate-100">{r.model || '-'}</div>
                            <div className="text-xs text-slate-500">{r.provider || '-'}</div>
                          </td>
                          <td className="py-2 pr-4 text-slate-700 dark:text-slate-200 whitespace-nowrap">{formatNumber(r.total_tokens || 0)}</td>
                          <td className="py-2 pr-4 text-slate-700 dark:text-slate-200 whitespace-nowrap">{r.latency_ms != null ? `${r.latency_ms}ms` : '-'}</td>
                          <td className="py-2 pr-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${bad ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}
                              title={r.error_message || ''}
                            >
                              {r.status_code}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('aiGateway.trendsTitle')}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTrendDays(7)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${
                  trendDays === 7
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                }`}
              >
                {t('aiGateway.range7')}
              </button>
              <button
                type="button"
                onClick={() => setTrendDays(30)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${
                  trendDays === 30
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                }`}
              >
                {t('aiGateway.range30')}
              </button>
              <button
                onClick={() => selectedAppId && fetchTrends(selectedAppId, trendDays)}
                className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                title={t('common.refresh')}
                disabled={!selectedAppId || isLoadingTrends}
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">{t('aiGateway.tokensUsed')}</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{formatNumber(trendSummary.totalTokens)}</div>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">{t('aiGateway.requestsUsed')}</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{formatNumber(trendSummary.totalReq)}</div>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">{t('aiGateway.failureRate')}</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{formatPct(trendSummary.errorRate)}</div>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">{t('aiGateway.p95Latency')}</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{`${Math.round(trendSummary.p95Avg)}ms`}</div>
            </div>
          </div>

          {isLoadingTrends ? (
            <div className="mt-4 text-sm text-slate-500">{t('common.loading')}</div>
          ) : trends.length === 0 ? (
            <div className="mt-4 text-sm text-slate-500">{t('aiGateway.noTrends')}</div>
          ) : (
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="h-56 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-600 dark:text-slate-300">{t('aiGateway.tokensTrend')}</div>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={trendTokens}
                      onClick={(e: any) => {
                        const d = e?.activeLabel;
                        if (typeof d === 'string') filterByDay(d);
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} tickFormatter={(v: any) => String(v).slice(5)} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="tokens" stroke="#6366F1" fill="#6366F1" fillOpacity={0.18} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="h-56 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-600 dark:text-slate-300">{t('aiGateway.qualityTrend')}</div>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trendQuality}
                      onClick={(e: any) => {
                        const d = e?.activeLabel;
                        if (typeof d === 'string') filterByDay(d);
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} tickFormatter={(v: any) => String(v).slice(5)} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line yAxisId="left" type="monotone" dataKey="p95" stroke="#F59E0B" strokeWidth={2} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="errorPct" stroke="#EF4444" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('aiGateway.alertsTitle')}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={previewAlerts}
                disabled={!selectedAppId || isLoadingAlertRule || isRunningAlert}
                className="px-3 py-1.5 rounded-lg text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-indigo-400 disabled:opacity-50"
              >
                {t('aiGateway.alertsPreview')}
              </button>
              <button
                type="button"
                onClick={() => runAlerts(true)}
                disabled={!selectedAppId || isLoadingAlertRule || isRunningAlert}
                className="px-3 py-1.5 rounded-lg text-sm font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 disabled:opacity-50"
              >
                {t('aiGateway.alertsRunDry')}
              </button>
              <button
                type="button"
                onClick={saveAlertRule}
                disabled={!selectedAppId || isLoadingAlertRule || isSavingAlertRule}
                className="px-3 py-1.5 rounded-lg text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {t('aiGateway.alertsSave')}
              </button>
            </div>
          </div>

          {isLoadingAlertRule ? (
            <div className="mt-4 text-sm text-slate-500">{t('common.loading')}</div>
          ) : (
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('aiGateway.alertsConfig')}</div>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={alertRule.is_enabled}
                      onChange={(e) => setAlertRule(prev => ({ ...prev, is_enabled: e.target.checked }))}
                      className="h-4 w-4"
                    />
                    {t('aiGateway.alertsEnabled')}
                  </label>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('aiGateway.alertsRecipients')}</div>
                    <input
                      value={alertRecipientsText}
                      onChange={(e) => setAlertRecipientsText(e.target.value)}
                      placeholder={t('aiGateway.alertsRecipientsPlaceholder')}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="mt-1 text-xs text-slate-500">{t('aiGateway.alertsRecipientsHint')}</div>
                  </div>

                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('aiGateway.alertsWindow')}</div>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="number"
                        value={alertRule.window_minutes}
                        onChange={(e) => setAlertRule(prev => ({ ...prev, window_minutes: Number(e.target.value || 60) }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="number"
                        value={alertRule.cooldown_minutes}
                        onChange={(e) => setAlertRule(prev => ({ ...prev, cooldown_minutes: Number(e.target.value || 60) }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{t('aiGateway.alertsWindowHint')}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('aiGateway.alertsTokenThreshold')}</div>
                    <input
                      type="number"
                      step="0.01"
                      value={alertRule.token_usage_threshold}
                      onChange={(e) => setAlertRule(prev => ({ ...prev, token_usage_threshold: Number(e.target.value || 0.8) }))}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('aiGateway.alertsRequestThreshold')}</div>
                    <input
                      type="number"
                      step="0.01"
                      value={alertRule.request_usage_threshold}
                      onChange={(e) => setAlertRule(prev => ({ ...prev, request_usage_threshold: Number(e.target.value || 0.8) }))}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('aiGateway.alertsErrorRateThreshold')}</div>
                    <input
                      type="number"
                      step="0.01"
                      value={alertRule.error_rate_threshold}
                      onChange={(e) => setAlertRule(prev => ({ ...prev, error_rate_threshold: Number(e.target.value || 0.05) }))}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('aiGateway.alertsP95Threshold')}</div>
                    <input
                      type="number"
                      value={alertRule.p95_latency_threshold_ms}
                      onChange={(e) => setAlertRule(prev => ({ ...prev, p95_latency_threshold_ms: Number(e.target.value || 2000) }))}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('aiGateway.alertsResult')}</div>
                {alertPreview ? (
                  <div className="mt-3 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-slate-600 dark:text-slate-300">{t('aiGateway.alertsToken')}</div>
                      <div className={`text-xs font-bold px-2 py-1 rounded-full ${alertPreview.breaches.token ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                        {alertPreview.ratios.tokenRatio == null ? '-' : formatPct(alertPreview.ratios.tokenRatio)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-slate-600 dark:text-slate-300">{t('aiGateway.alertsRequest')}</div>
                      <div className={`text-xs font-bold px-2 py-1 rounded-full ${alertPreview.breaches.request ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                        {alertPreview.ratios.requestRatio == null ? '-' : formatPct(alertPreview.ratios.requestRatio)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-slate-600 dark:text-slate-300">{t('aiGateway.alertsErrorRate')}</div>
                      <div className={`text-xs font-bold px-2 py-1 rounded-full ${alertPreview.breaches.error_rate ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                        {formatPct(alertPreview.window.error_rate)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-slate-600 dark:text-slate-300">{t('aiGateway.alertsP95')}</div>
                      <div className={`text-xs font-bold px-2 py-1 rounded-full ${alertPreview.breaches.p95_latency ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                        {`${Math.round(alertPreview.window.p95_latency_ms)}ms`}
                      </div>
                    </div>
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                      {t('aiGateway.alertsResultHint')}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAlertPreview(null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                      >
                        {t('aiGateway.alertsClearPreview')}
                      </button>
                      <button
                        type="button"
                        onClick={() => runAlerts(false)}
                        disabled={isRunningAlert}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                      >
                        {t('aiGateway.alertsRunSend')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-slate-500">{t('aiGateway.alertsNoPreview')}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {isLoadingPolicy ? (
          <div className="mt-6 text-sm text-slate-500">{t('common.loading')}</div>
        ) : (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('aiGateway.model')}</div>
              <div className="mt-3 space-y-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('aiGateway.defaultModel')}</div>
                  <input
                    value={policy.default_model ?? ''}
                    onChange={(e) => setPolicy(prev => ({ ...prev, default_model: e.target.value || null }))}
                    placeholder={t('aiGateway.defaultModelPlaceholder')}
                    list="ai-gateway-models"
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <datalist id="ai-gateway-models">
                    {modelOptions.map(m => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {isLoadingModels ? (
                      <span className="text-xs text-slate-500">{t('common.loading')}</span>
                    ) : modelOptions.length === 0 ? (
                      <span className="text-xs text-slate-500">{t('aiGateway.noModels')}</span>
                    ) : (
                      modelOptions.slice(0, 10).map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPolicy(prev => ({ ...prev, default_model: m }))}
                          className={`px-2 py-1 rounded-full text-xs font-bold border transition-colors ${
                            policy.default_model === m
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                          }`}
                        >
                          {m}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('aiGateway.allowedModels')}</div>
                  <input
                    value={allowedModelsText}
                    onChange={(e) => setAllowedModelsText(e.target.value)}
                    placeholder={t('aiGateway.allowedModelsPlaceholder')}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="mt-1 text-xs text-slate-500">{t('aiGateway.allowedModelsHint')}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {modelOptions.slice(0, 14).map(m => {
                      const active = allowedList.includes(m);
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => toggleAllowedModel(m)}
                          className={`px-2 py-1 rounded-full text-xs font-bold border transition-colors ${
                            active
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
                          }`}
                          title={t('aiGateway.clickToggle')}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('aiGateway.quota')}</div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('aiGateway.dailyTokenLimit')}</div>
                  <input
                    type="number"
                    value={policy.daily_token_limit ?? ''}
                    onChange={(e) => setPolicy(prev => ({ ...prev, daily_token_limit: toNumberOrNull(e.target.value) }))}
                    placeholder={t('aiGateway.unlimited')}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('aiGateway.dailyRequestLimit')}</div>
                  <input
                    type="number"
                    value={policy.daily_request_limit ?? ''}
                    onChange={(e) => setPolicy(prev => ({ ...prev, daily_request_limit: toNumberOrNull(e.target.value) }))}
                    placeholder={t('aiGateway.unlimited')}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('aiGateway.maxInputTokens')}</div>
                  <input
                    type="number"
                    value={policy.max_input_tokens ?? ''}
                    onChange={(e) => setPolicy(prev => ({ ...prev, max_input_tokens: toNumberOrNull(e.target.value) }))}
                    placeholder={t('aiGateway.unlimited')}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('aiGateway.maxOutputTokens')}</div>
                  <input
                    type="number"
                    value={policy.max_output_tokens ?? ''}
                    onChange={(e) => setPolicy(prev => ({ ...prev, max_output_tokens: toNumberOrNull(e.target.value) }))}
                    placeholder={t('aiGateway.unlimited')}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 lg:col-span-2">
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('aiGateway.security')}</div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div>
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{t('aiGateway.allowTools')}</div>
                    <div className="text-xs text-slate-500">{t('aiGateway.allowToolsDesc')}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={policy.allow_tools}
                    onChange={(e) => setPolicy(prev => ({ ...prev, allow_tools: e.target.checked }))}
                    className="h-4 w-4"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div>
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{t('aiGateway.allowContentLogging')}</div>
                    <div className="text-xs text-slate-500">{t('aiGateway.allowContentLoggingDesc')}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={policy.allow_content_logging}
                    onChange={(e) => setPolicy(prev => ({ ...prev, allow_content_logging: e.target.checked }))}
                    className="h-4 w-4"
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedRequest(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white dark:bg-slate-950 shadow-2xl border-l border-slate-200 dark:border-slate-800 overflow-y-auto">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">{t('aiGateway.requestDetails')}</div>
                <div className="text-xs text-slate-500">{formatDateTime(selectedRequest.created_at)}</div>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                title={t('aiGateway.close')}
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                  <div className="text-xs text-slate-500">{t('aiGateway.endpoint')}</div>
                  <div className="mt-1 text-sm font-mono text-slate-800 dark:text-slate-100 break-all">{selectedRequest.endpoint}</div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        filterByEndpoint(selectedRequest.endpoint);
                        setSelectedRequest(null);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-indigo-400"
                      title={t('aiGateway.quickFilter')}
                    >
                      {t('aiGateway.filterEndpointBtn')}
                    </button>
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                  <div className="text-xs text-slate-500">{t('aiGateway.requestId')}</div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div className="text-sm font-mono text-slate-800 dark:text-slate-100 break-all">{selectedRequest.request_id}</div>
                    <button
                      className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                      onClick={async () => {
                        const ok = await copyToClipboard(selectedRequest.request_id);
                        if (ok) showToast(t('aiGateway.copied'), 'success');
                      }}
                      title={t('aiGateway.copy')}
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        filterByRequestId(selectedRequest.request_id);
                        setSelectedRequest(null);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      title={t('aiGateway.quickFilter')}
                    >
                      {t('aiGateway.filterRequestIdBtn')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        clearRequestFilters();
                        setSelectedRequest(null);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-rose-400"
                    >
                      {t('aiGateway.clearFilters')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="text-xs text-slate-500">{t('aiGateway.provider')}</div>
                  <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{selectedRequest.provider || '-'}</div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="text-xs text-slate-500">{t('aiGateway.modelCol')}</div>
                  <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{selectedRequest.model || '-'}</div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="text-xs text-slate-500">{t('aiGateway.statusCol')}</div>
                  <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{selectedRequest.status_code}</div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="text-xs text-slate-500">{t('aiGateway.latencyCol')}</div>
                  <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{selectedRequest.latency_ms != null ? `${selectedRequest.latency_ms}ms` : '-'}</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('aiGateway.tokensBreakdown')}</div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-xs text-slate-500">{t('aiGateway.promptTokens')}</div>
                    <div className="text-base font-bold text-slate-900 dark:text-white">{formatNumber(selectedRequest.prompt_tokens || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">{t('aiGateway.completionTokens')}</div>
                    <div className="text-base font-bold text-slate-900 dark:text-white">{formatNumber(selectedRequest.completion_tokens || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">{t('aiGateway.totalTokens')}</div>
                    <div className="text-base font-bold text-slate-900 dark:text-white">{formatNumber(selectedRequest.total_tokens || 0)}</div>
                  </div>
                </div>
              </div>

              {selectedRequest.error_message && (
                <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20">
                  <div className="text-sm font-bold text-rose-800 dark:text-rose-200">{t('aiGateway.errorReason')}</div>
                  <div className="mt-2 text-sm text-rose-700 dark:text-rose-200 whitespace-pre-wrap break-words">{selectedRequest.error_message}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
