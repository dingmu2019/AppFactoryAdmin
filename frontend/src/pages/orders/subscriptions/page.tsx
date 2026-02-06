
import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { authenticatedFetch } from '../../../lib/http';
import { useToast, usePageHeader, useI18n } from '../../../contexts';

type Subscription = {
  id: string;
  plan_key: string;
  status: string;
  provider?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
  user?: { email?: string | null } | null;
};

const statusBadge = (status: string) => {
  const base = 'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide';
  const s = (status || '').toLowerCase();
  if (s === 'active') return `${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400`;
  if (s === 'trialing') return `${base} bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400`;
  if (s === 'past_due') return `${base} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400`;
  if (s === 'canceled') return `${base} bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400`;
  return `${base} bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default function SubscriptionPage() {
  const { showToast } = useToast();
  const { setPageHeader } = usePageHeader();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<Subscription[]>([]);

  useEffect(() => {
    setPageHeader(t('commerce.subscriptions.title'), t('commerce.subscriptions.subtitle'));
  }, [setPageHeader, t]);

  const fetchSubs = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/admin/subscriptions');
      if (!res.ok) {
        const text = await res.text();
        showToast(`加载订阅失败 (${res.status}): ${text}`, 'error');
        return;
      }
      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.data || []);
      setSubs(list);
    } catch (e: any) {
      showToast(e?.message || '加载订阅失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-4">
        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          onClick={fetchSubs}
        >
          <RefreshCw size={16} />
          {t('commerce.subscriptions.refresh')}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">User Email</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{t('commerce.subscriptions.plan')}</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{t('commerce.subscriptions.status')}</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{t('commerce.subscriptions.provider')}</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{t('commerce.subscriptions.periodEnd')}</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{t('commerce.subscriptions.autoRenew')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500 dark:text-slate-400" colSpan={6}>
                    {t('common.loading')}
                  </td>
                </tr>
              ) : subs.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500 dark:text-slate-400" colSpan={6}>
                    {t('commerce.subscriptions.noSubs')}
                  </td>
                </tr>
              ) : (
                subs.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{s.user?.email || '-'}</td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{(s.plan_key || '').toUpperCase()}</td>
                    <td className="px-4 py-3">
                      <span className={statusBadge(s.status)}>{(s.status || 'unknown').toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{s.provider || '-'}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatDateTime(s.current_period_end)}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {s.cancel_at_period_end ? 'NO' : 'YES'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
