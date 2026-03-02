import React, { useEffect, useMemo, useState } from 'react';
import { Save, Send, RefreshCw, Bell, Mail, Webhook, MessageSquare } from 'lucide-react';
import { authenticatedFetch } from '../../../../lib/http';
import { useToast, useI18n } from '../../../../contexts';

type ChannelType = 'email' | 'sms' | 'im' | 'whatsapp';
type ProviderType = 'smtp' | 'webhook';

type Overview = {
  channels: Array<{ id: string; channel_type: ChannelType; name: string; is_enabled: boolean }>;
  providers: Array<{ id: string; channel_id: string; provider_type: ProviderType; name: string; config: any; is_enabled: boolean }>;
  routes: Array<{ id: string; channel_id: string; message_type: string; provider_id: string; priority: number; is_enabled: boolean }>;
  templates: Array<{ id: string; channel_id: string; message_type: string; language: string; subject: string | null; body: string; format: string; is_enabled: boolean }>;
};

function safeJsonParse(value: string) {
  try {
    return { ok: true as const, value: JSON.parse(value) };
  } catch (err: any) {
    return { ok: false as const, error: err?.message || 'Invalid JSON' };
  }
}

export const NotificationConfigForm: React.FC = () => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);

  const [channelType, setChannelType] = useState<ChannelType>('email');
  const [channelName, setChannelName] = useState<string>('Email');
  const [channelEnabled, setChannelEnabled] = useState<boolean>(true);
  const [messageType, setMessageType] = useState<string>('login_verification');
  const [providerType, setProviderType] = useState<ProviderType>('smtp');
  const [providerName, setProviderName] = useState<string>('default');
  const [providerEnabled, setProviderEnabled] = useState<boolean>(true);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [webhookHeaders, setWebhookHeaders] = useState<string>('{}');
  const [templateSubject, setTemplateSubject] = useState<string>(() => t('integration.notification.defaults.loginSubject'));
  const [templateBody, setTemplateBody] = useState<string>(() => t('integration.notification.defaults.loginHtml'));
  const [templateFormat, setTemplateFormat] = useState<'text' | 'html' | 'json'>('html');
  const [testTo, setTestTo] = useState<string>('');
  const [testVars, setTestVars] = useState<string>('{}');

  const channelsByType = useMemo(() => {
    const map = new Map<ChannelType, Overview['channels'][number]>();
    for (const c of overview?.channels || []) map.set(c.channel_type, c);
    return map;
  }, [overview]);

  const providersByChannel = useMemo(() => {
    const map = new Map<string, Overview['providers'][number][]>();
    for (const p of overview?.providers || []) {
      const arr = map.get(p.channel_id) || [];
      arr.push(p);
      map.set(p.channel_id, arr);
    }
    return map;
  }, [overview]);

  const templatesByChannel = useMemo(() => {
    const map = new Map<string, Overview['templates'][number][]>();
    for (const t of overview?.templates || []) {
      const arr = map.get(t.channel_id) || [];
      arr.push(t);
      map.set(t.channel_id, arr);
    }
    return map;
  }, [overview]);

  const fetchOverview = async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    const isFirstLoad = overview === null;
    if (isFirstLoad) {
      setLoading(true);
    } else if (!silent) {
      setRefreshing(true);
    }
    try {
      const res = await authenticatedFetch('/api/admin/notifications');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to load notification config');
      }
      const data = (await res.json()) as Overview;
      setOverview(data);
    } catch (err: any) {
      showToast(err.message || t('common.loadFailed'), 'error');
    } finally {
      if (isFirstLoad) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    const ch = channelsByType.get(channelType);
    setChannelName(ch?.name || channelType.toUpperCase());
    setChannelEnabled(ch?.is_enabled ?? (channelType === 'email'));

    const chId = ch?.id;
    const providers = chId ? providersByChannel.get(chId) || [] : [];
    const defaultProvider = providers.find(p => p.name === 'default') || providers[0];
    if (defaultProvider) {
      setProviderType(defaultProvider.provider_type);
      setProviderName(defaultProvider.name);
      setProviderEnabled(defaultProvider.is_enabled);
      setWebhookUrl(defaultProvider.config?.url || '');
      setWebhookHeaders(JSON.stringify(defaultProvider.config?.headers || {}, null, 2));
    } else {
      setProviderType(channelType === 'email' ? 'smtp' : 'webhook');
      setProviderName('default');
      setProviderEnabled(true);
      setWebhookUrl('');
      setWebhookHeaders('{}');
    }

    const templates = chId ? templatesByChannel.get(chId) || [] : [];
    const t_data = templates.find(x => x.message_type === messageType && x.language === 'zh-CN') || templates[0];
    if (t_data) {
      setTemplateSubject(t_data.subject || '');
      setTemplateBody(t_data.body || '');
      setTemplateFormat((t_data.format as any) || 'text');
    } else {
      if (channelType === 'email' && messageType === 'login_verification') {
        setTemplateSubject(t('integration.notification.defaults.loginSubject'));
        setTemplateBody(t('integration.notification.defaults.loginHtml'));
        setTemplateFormat('html');
      } else {
        setTemplateSubject(t('integration.notification.defaults.genericSubject'));
        setTemplateBody(t('integration.notification.defaults.genericJson'));
        setTemplateFormat('json');
      }
    }
  }, [channelType, channelsByType, providersByChannel, templatesByChannel, messageType, t]);

  const handleSave = async () => {
    const headersParsed = safeJsonParse(webhookHeaders || '{}');
    if (!headersParsed.ok) return showToast(t('integration.notification.errors.invalidHeaders', { error: headersParsed.error }), 'error');
    if (providerType === 'webhook' && !webhookUrl) return showToast(t('integration.notification.errors.webhookUrlRequired'), 'error');
    if (!templateBody) return showToast(t('integration.notification.errors.templateBodyRequired'), 'error');

    setSavingKey(`${channelType}:${messageType}`);
    try {
      const res = await authenticatedFetch(`/api/admin/notifications/channels/${channelType}`, {
        method: 'POST',
        body: JSON.stringify({
          channelName,
          isEnabled: channelEnabled,
          provider: {
            providerType,
            name: providerName,
            isEnabled: providerEnabled,
            config: providerType === 'webhook' ? { url: webhookUrl, headers: headersParsed.value } : {}
          },
          route: { messageType, priority: 100, isEnabled: true },
          template: {
            messageType,
            language: 'zh-CN',
            subject: templateSubject,
            body: templateBody,
            format: templateFormat,
            isEnabled: true
          }
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || t('common.saveFailed'));
      }

      await fetchOverview({ silent: true });
      showToast(t('common.saveSuccess'), 'success');
    } catch (err: any) {
      showToast(err.message || t('common.saveFailed'), 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const handleTest = async () => {
    const varsParsed = safeJsonParse(testVars || '{}');
    if (!varsParsed.ok) return showToast(t('integration.notification.errors.invalidHeaders', { error: varsParsed.error }), 'error');
    if (!testTo) return showToast(t('integration.notification.testRecipient'), 'error');

    try {
      const res = await authenticatedFetch('/api/admin/notifications/test', {
        method: 'POST',
        body: JSON.stringify({
          channelType,
          to: testTo,
          messageType,
          variables: { ...varsParsed.value, messageType, variables: varsParsed.value }
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t('common.testFailed'));
      showToast(t('common.testSuccess'), 'success');
    } catch (err: any) {
      showToast(err.message || t('common.testFailed'), 'error');
    }
  };

  if (loading && !overview) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          {t('common.loading')}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Bell className="text-indigo-600" size={24} />
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{t('integration.notification.title')}</h2>
        </div>
        <button
          onClick={() => fetchOverview()}
          disabled={refreshing || savingKey !== null}
          className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {refreshing ? (
            <div className="w-4 h-4 border-2 border-zinc-400/40 border-t-zinc-500 rounded-full animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          {t('common.refresh')}
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-6 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{t('integration.notification.channel')}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['email', 'sms', 'im', 'whatsapp'] as ChannelType[]).map(ct => (
                <button
                  key={ct}
                  onClick={() => setChannelType(ct)}
                  className={`px-4 py-3 rounded-lg text-sm font-bold border transition-all flex items-center justify-center gap-2 ${
                    channelType === ct
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 shadow-sm'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-indigo-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  {ct === 'email' && <Mail size={16} />}
                  {ct === 'im' && <MessageSquare size={16} />}
                  {ct === 'whatsapp' && <Webhook size={16} />}
                  {t(`integration.notification.types.${ct}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm font-bold text-zinc-700 dark:text-zinc-200 whitespace-nowrap">{t('integration.notification.messageType')}</div>
            <select
              value={messageType}
              onChange={e => setMessageType(e.target.value)}
              className="flex-1 min-w-[220px] px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option value="login_verification">{t('integration.notification.messageTypes.login_verification')}</option>
              <option value="generic">{t('integration.notification.messageTypes.generic')}</option>
              <option value="test">{t('integration.notification.messageTypes.test')}</option>
            </select>
          </div>
        </div>

        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{t('integration.notification.config')}</div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                {channelEnabled ? t('common.enabled') : t('common.disabled')}
              </span>
              <button
                onClick={() => setChannelEnabled(v => !v)}
                className={`w-12 h-6 rounded-full transition-colors relative ${channelEnabled ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${channelEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('integration.notification.name')}</label>
              <input
                value={channelName}
                onChange={e => setChannelName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('integration.notification.providerType')}</label>
              <select
                value={providerType}
                onChange={e => setProviderType(e.target.value as ProviderType)}
                className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
              >
                <option value="smtp">{t('integration.notification.providers.smtp')}</option>
                <option value="webhook">{t('integration.notification.providers.webhook')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('integration.notification.providerName')}</label>
              <input
                value={providerName}
                onChange={e => setProviderName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('integration.notification.providerStatus')}</label>
              <select
                value={providerEnabled ? 'enabled' : 'disabled'}
                onChange={e => setProviderEnabled(e.target.value === 'enabled')}
                className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
              >
                <option value="enabled">{t('common.enabled')}</option>
                <option value="disabled">{t('common.disabled')}</option>
              </select>
            </div>
          </div>

          {providerType === 'webhook' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('integration.notification.webhookUrl')}</label>
                <input
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  placeholder="https://example.com/webhook"
                  className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('integration.notification.headers')}</label>
                <textarea
                  value={webhookHeaders}
                  onChange={e => setWebhookHeaders(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white font-mono text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                />
              </div>
            </div>
          )}

          <div className="space-y-4 pt-2">
            <div className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{t('integration.notification.template')}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('integration.notification.format')}</label>
                <select
                  value={templateFormat}
                  onChange={e => setTemplateFormat(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  <option value="text">{t('integration.notification.formatOptions.text')}</option>
                  <option value="html">{t('integration.notification.formatOptions.html')}</option>
                  <option value="json">{t('integration.notification.formatOptions.json')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('integration.notification.subject')}</label>
                <input
                  value={templateSubject}
                  onChange={e => setTemplateSubject(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">
                {t('integration.notification.body')}
              </label>
              <textarea
                value={templateBody}
                onChange={e => setTemplateBody(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white font-mono text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('integration.notification.testRecipient')}</label>
              <input
                value={testTo}
                onChange={e => setTestTo(e.target.value)}
                placeholder={t(`integration.notification.recipientPlaceholder.${channelType === 'email' ? 'email' : 'im'}`)}
                className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('integration.notification.variables')}</label>
              <textarea
                value={testVars}
                onChange={e => setTestVars(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white font-mono text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800">
            <button
              onClick={handleTest}
              className="px-6 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all flex items-center gap-2"
            >
              <Send size={18} />
              {t('integration.notification.sendTest')}
            </button>
            <button
              onClick={handleSave}
              disabled={savingKey !== null}
              className="px-8 py-2.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {savingKey ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
