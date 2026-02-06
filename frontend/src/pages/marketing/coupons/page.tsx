import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { authenticatedFetch } from '../../../lib/http';
import { useToast, usePageHeader, useI18n } from '../../../contexts';

type CouponType = 'fixed' | 'percent';

type Coupon = {
  id: string;
  app_id?: string;
  code: string;
  type: CouponType;
  value: number;
  usage_count?: number;
  usage_limit?: number | null;
  end_at?: string | null;
  is_active?: boolean;
};

type SaaSAppOption = {
  id: string;
  name: string;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '∞';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const badge = (active: boolean) => {
  const base = 'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide';
  return active
    ? `${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400`
    : `${base} bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400`;
};

export default function CouponPage() {
  const { showToast } = useToast();
  const { setPageHeader } = usePageHeader();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageHeader(t('commerce.coupons.title'), t('commerce.coupons.subtitle'));
  }, [setPageHeader, t]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [apps, setApps] = useState<SaaSAppOption[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>('');

  const [form, setForm] = useState({
    code: '',
    type: 'fixed' as CouponType,
    value: '0',
    min_purchase: '',
    usage_limit: '',
    end_at: '',
    description: ''
  });

  const canSubmit = useMemo(() => {
    const value = Number(form.value);
    return form.code.trim().length > 0 && Number.isFinite(value) && value > 0 && selectedAppId.trim().length > 0;
  }, [form.code, form.value]);

  const fetchApps = async () => {
    try {
      const res = await authenticatedFetch('/api/admin/apps');
      if (!res.ok) return;
      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.data || []);
      const mapped: SaaSAppOption[] = list.map((app: any) => ({
        id: app.id,
        name: app.name
      }));
      setApps(mapped);
      // Remove auto-select to allow "All Apps" as default
      // if (!selectedAppId && mapped.length > 0) {
      //   setSelectedAppId(mapped[0].id);
      // }
    } catch {}
  };

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const query = selectedAppId ? `?app_id=${encodeURIComponent(selectedAppId)}` : '';
      const res = await authenticatedFetch(`/api/admin/coupons${query}`);
      if (!res.ok) {
        showToast(`加载优惠券失败 (${res.status})`, 'error');
        return;
      }
      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.data || []);
      setCoupons(list);
    } catch (e: any) {
      showToast(e?.message || '加载优惠券失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
    // Fetch coupons initially (for all apps)
    fetchCoupons();
  }, []);

  useEffect(() => {
    // Only fetch if selectedAppId changes (fetchApps already triggers initial fetch if we rely on useEffect deps, but we want manual control or correct dependency)
    // Actually, fetchCoupons depends on selectedAppId state.
    // If we removed auto-select, selectedAppId is "" initially.
    // We should allow fetching when selectedAppId is ""
    fetchCoupons();
  }, [selectedAppId]);

  const resetForm = () => {
    setForm({
      code: '',
      type: 'fixed',
      value: '0',
      min_purchase: '',
      usage_limit: '',
      end_at: '',
      description: ''
    });
  };

  const handleCreate = async () => {
    if (!canSubmit) return;
    if (!selectedAppId) {
      showToast('请选择应用', 'error');
      return;
    }
    try {
      const payload: any = {
        app_id: selectedAppId,
        code: form.code.trim(),
        type: form.type,
        value: Number(form.value),
        description: form.description.trim() || undefined
      };

      if (form.min_purchase.trim() !== '') payload.min_purchase = Number(form.min_purchase);
      if (form.usage_limit.trim() !== '') payload.usage_limit = Number(form.usage_limit);
      if (form.end_at.trim() !== '') payload.end_at = new Date(form.end_at).toISOString();

      const res = await authenticatedFetch('/api/admin/coupons', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text();
        showToast(`创建失败 (${res.status}): ${text}`, 'error');
        return;
      }

      showToast('优惠券已创建', 'success');
      setIsModalOpen(false);
      resetForm();
      await fetchCoupons();
    } catch (e: any) {
      showToast(e?.message || '创建失败', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = window.confirm('确认删除该优惠券？');
    if (!ok) return;
    try {
      const res = await authenticatedFetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const text = await res.text();
        showToast(`删除失败 (${res.status}): ${text}`, 'error');
        return;
      }
      showToast('已删除', 'success');
      await fetchCoupons();
    } catch (e: any) {
      showToast(e?.message || '删除失败', 'error');
    }
  };

  const appNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of apps) map.set(a.id, a.name);
    return map;
  }, [apps]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={selectedAppId}
            onChange={e => setSelectedAppId(e.target.value)}
          >
            <option value="">
              {t('common.allApps')}
            </option>
            {apps.map(a => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none transition-all"
          onClick={() => setIsModalOpen(true)}
          disabled={!selectedAppId}
        >
          <Plus size={16} />
          {t('commerce.coupons.create')}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-xs">{t('commerce.coupons.code')}</th>
                <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-xs">{t('commerce.coupons.type')}</th>
                <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-xs">{t('commerce.coupons.value')}</th>
                <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-xs">{t('commerce.coupons.usage')}</th>
                <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-xs">{t('commerce.coupons.validUntil')}</th>
                <th className="text-left px-6 py-4 font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-xs">{t('commerce.coupons.status')}</th>
                <th className="text-right px-6 py-4 font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-xs">{t('common.delete')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td className="px-6 py-8 text-slate-500 dark:text-slate-400 text-center" colSpan={7}>
                    {t('common.loading')}
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td className="px-6 py-8 text-slate-500 dark:text-slate-400 text-center" colSpan={7}>
                    {t('commerce.coupons.noCoupons')}
                  </td>
                </tr>
              ) : (
                coupons.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-900 dark:text-slate-100">{c.code}</td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                        {c.type === 'percent' ? t('commerce.coupons.percent') : t('commerce.coupons.fixed')}
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                      {c.type === 'percent' ? `${c.value}%` : `$${c.value}`}
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                      {(c.usage_count ?? 0).toString()} / {(c.usage_limit ?? '∞').toString()}
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{formatDateTime(c.end_at)}</td>
                    <td className="px-6 py-4">
                      <span className={badge(!!c.is_active)}>{c.is_active ? t('users.status.active') : t('users.status.inactive')}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors inline-flex items-center justify-center"
                        onClick={() => handleDelete(c.id)}
                        title={t('common.delete')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('commerce.coupons.create')}</h2>
              <button
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('commerce.coupons.app')}</label>
                <div className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
                  {appNameById.get(selectedAppId) || selectedAppId}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('commerce.coupons.code')}</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    value={form.code}
                    onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="SUMMER2026"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('commerce.coupons.type')}</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    value={form.type}
                    onChange={e => setForm(prev => ({ ...prev, type: e.target.value as CouponType }))}
                  >
                    <option value="fixed">{t('commerce.coupons.fixed')}</option>
                    <option value="percent">{t('commerce.coupons.percent')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('commerce.coupons.value')}</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    value={form.value}
                    onChange={e => setForm(prev => ({ ...prev, value: e.target.value }))}
                    type="number"
                    min="0"
                    step="1"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('commerce.coupons.minPurchase')}</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    value={form.min_purchase}
                    onChange={e => setForm(prev => ({ ...prev, min_purchase: e.target.value }))}
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('commerce.coupons.usageLimit')}</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    value={form.usage_limit}
                    onChange={e => setForm(prev => ({ ...prev, usage_limit: e.target.value }))}
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('commerce.coupons.expiry')}</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    value={form.end_at}
                    onChange={e => setForm(prev => ({ ...prev, end_at: e.target.value }))}
                    type="datetime-local"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('commerce.coupons.desc')}</label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-white ${canSubmit ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-400 cursor-not-allowed'}`}
                onClick={handleCreate}
                disabled={!canSubmit}
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
