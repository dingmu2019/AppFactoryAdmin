'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { authenticatedFetch } from '@/lib/http';
import { useToast, usePageHeader, useI18n } from '@/contexts';
import { ConfirmModal } from '@/components/ConfirmModal';

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

const badge = (active: boolean) => {
  const base = 'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide';
  return active
    ? `${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400`
    : `${base} bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400`;
};

export default function CouponsPage() {
  const { showToast } = useToast();
  const { setPageHeader } = usePageHeader();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [apps, setApps] = useState<SaaSAppOption[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const infinity = t('common.infinity');

  const formatDateTime = (value?: string | null) => {
    if (!value) return infinity;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  useEffect(() => {
    setPageHeader(t('commerce.coupons.title'), t('commerce.coupons.subtitle'));
  }, [setPageHeader, t]);

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
  }, [form.code, form.value, selectedAppId]);

  const fetchApps = useCallback(async () => {
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
    } catch {}
  }, []);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const query = selectedAppId ? `?app_id=${encodeURIComponent(selectedAppId)}` : '';
      const res = await authenticatedFetch(`/api/admin/coupons${query}`);
      if (!res.ok) {
        showToast(t('commerce.coupons.toast.loadFailedWithStatus', { status: res.status }), 'error');
        return;
      }
      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.data || []);
      setCoupons(list);
    } catch (e: any) {
      showToast(e?.message || t('commerce.coupons.toast.loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedAppId, showToast, t]);

  useEffect(() => {
    fetchApps();
    fetchCoupons();
  }, [fetchApps, fetchCoupons]);

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
      showToast(t('commerce.coupons.toast.selectAppRequired'), 'error');
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
        showToast(t('commerce.coupons.toast.createFailedWithStatus', { status: res.status, text }), 'error');
        return;
      }

      showToast(t('commerce.coupons.toast.created'), 'success');
      setIsModalOpen(false);
      resetForm();
      await fetchCoupons();
    } catch (e: any) {
      showToast(e?.message || t('commerce.coupons.toast.createFailed'), 'error');
    }
  };

  const handleDelete = (id: string) => {
    setPendingDeleteId(id);
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      const res = await authenticatedFetch(`/api/admin/coupons/${pendingDeleteId}`, { method: 'DELETE' });
      if (!res.ok) {
        const text = await res.text();
        showToast(t('commerce.coupons.toast.deleteFailedWithStatus', { status: res.status, text }), 'error');
        return;
      }
      showToast(t('commerce.coupons.toast.deleted'), 'success');
      await fetchCoupons();
    } catch (e: any) {
      showToast(e?.message || t('commerce.coupons.toast.deleteFailed'), 'error');
    } finally {
      setPendingDeleteId(null);
    }
  };

  const appNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of apps) map.set(a.id, a.name);
    return map;
  }, [apps]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select
            className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={selectedAppId}
            onChange={e => setSelectedAppId(e.target.value)}
          >
            <option value="">{t('common.allApps')}</option>
            {apps.map(a => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={() => setIsModalOpen(true)}
          disabled={!selectedAppId}
        >
          <Plus size={16} />
          {t('commerce.coupons.create')}
        </button>
      </div>

      <ConfirmModal
        isOpen={confirmDeleteOpen}
        onClose={() => {
          setConfirmDeleteOpen(false);
          setPendingDeleteId(null);
        }}
        onConfirm={confirmDelete}
        title={t('common.confirmDelete')}
        message={t('common.confirmDeleteMsg')}
        cancelText={t('common.cancel')}
        confirmText={t('common.delete')}
      />

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="text-left px-6 py-4 font-semibold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider text-xs">{t('commerce.coupons.code')}</th>
                <th className="text-left px-6 py-4 font-semibold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider text-xs">{t('commerce.coupons.type')}</th>
                <th className="text-left px-6 py-4 font-semibold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider text-xs">{t('commerce.coupons.value')}</th>
                <th className="text-left px-6 py-4 font-semibold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider text-xs">{t('commerce.coupons.usage')}</th>
                <th className="text-left px-6 py-4 font-semibold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider text-xs">{t('commerce.coupons.validUntil')}</th>
                <th className="text-left px-6 py-4 font-semibold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider text-xs">{t('commerce.coupons.status')}</th>
                <th className="text-right px-6 py-4 font-semibold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider text-xs">{t('common.delete')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    {t('commerce.coupons.noCoupons')}
                  </td>
                </tr>
              ) : (
                coupons.map(c => (
                  <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-indigo-600 dark:text-indigo-400">{c.code}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        {c.type === 'fixed' ? t('commerce.coupons.fixed') : t('commerce.coupons.percent')}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-white">
                      {c.type === 'fixed' ? `$${c.value}` : `${c.value}%`}
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                      {(c.usage_count ?? 0).toString()} / {(c.usage_limit ?? infinity).toString()}
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">{formatDateTime(c.end_at)}</td>
                    <td className="px-6 py-4">
                      <span className={badge(Boolean(c.is_active))}>{c.is_active ? t('common.active') : t('common.inactive')}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                        onClick={() => handleDelete(c.id)}
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
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="font-bold text-zinc-900 dark:text-white">{t('commerce.coupons.create')}</div>
              <button
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
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
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('commerce.coupons.app')}</label>
                <div className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
                  {appNameById.get(selectedAppId) || selectedAppId}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('commerce.coupons.code')}</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
                    value={form.code}
                    onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
                    placeholder={t('commerce.coupons.form.codePlaceholder')}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('commerce.coupons.type')}</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
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
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('commerce.coupons.value')}</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
                    value={form.value}
                    onChange={e => setForm(prev => ({ ...prev, value: e.target.value }))}
                    type="number"
                    min="0"
                    step="1"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('commerce.coupons.minPurchase')}</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
                    value={form.min_purchase}
                    onChange={e => setForm(prev => ({ ...prev, min_purchase: e.target.value }))}
                    type="number"
                    min="0"
                    step="1"
                    placeholder={t('common.optional')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('commerce.coupons.usageLimit')}</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
                    value={form.usage_limit}
                    onChange={e => setForm(prev => ({ ...prev, usage_limit: e.target.value }))}
                    type="number"
                    min="1"
                    step="1"
                    placeholder={t('common.optional')}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('commerce.coupons.expiry')}</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
                    value={form.end_at}
                    onChange={e => setForm(prev => ({ ...prev, end_at: e.target.value }))}
                    type="datetime-local"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('commerce.coupons.desc')}</label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-white ${canSubmit ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-zinc-400 cursor-not-allowed'}`}
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
