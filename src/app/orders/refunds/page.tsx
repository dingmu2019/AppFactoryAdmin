
'use client';

import React, { useEffect, useState } from 'react';
import { RotateCcw, Search, RefreshCw, Eye, XCircle, DollarSign, TrendingUp, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useI18n, useToast, usePageHeader } from '@/contexts';
import { fetchRefunds, fetchRefundStats, type RefundItem } from '@/services/refundService';

export default function OrderRefundsPage() {
  const { t, locale } = useI18n();
  const { showToast } = useToast();
  const { setPageHeader } = usePageHeader();

  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayCount: 0,
    todayAmount: 0,
    last7DaysCount: 0,
    last7DaysAmount: 0,
    totalCount: 0
  });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [refundNoQuery, setRefundNoQuery] = useState('');
  const [orderNoQuery, setOrderNoQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [selectedRefund, setSelectedRefund] = useState<RefundItem | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  useEffect(() => {
    setPageHeader(t('common.orderRefund'), t('commerce.subtitle'));
  }, [setPageHeader, t]);

  const loadRefundList = async () => {
    setLoading(true);
    try {
      const data = await fetchRefunds({
        page,
        pageSize: 10,
        refundNo: refundNoQuery || undefined,
        orderNo: orderNoQuery || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined
      });
      setRefunds(data.data || []);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      showToast(err?.message || t('common.loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await fetchRefundStats();
      setStats({
        todayCount: data.todayCount || 0,
        todayAmount: data.todayAmount || 0,
        last7DaysCount: data.last7DaysCount || 0,
        last7DaysAmount: data.last7DaysAmount || 0,
        totalCount: data.totalCount || 0
      });
    } catch {}
  };

  useEffect(() => {
    loadRefundList();
    loadStats();
  }, [page, statusFilter, typeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadRefundList();
    loadStats();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const statusBadge = (status: string) => {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide';
    if (status === 'success') return `${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400`;
    if (status === 'failed') return `${base} bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400`;
    if (status === 'processing') return `${base} bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400`;
    return `${base} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400`;
  };

  const typeBadge = (type: string) => {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide';
    if (type === 'full') return `${base} bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300`;
    if (type === 'partial') return `${base} bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400`;
    return `${base} bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300`;
  };

  const openDetail = (refund: RefundItem, index: number) => {
    setSelectedRefund(refund);
    setSelectedIndex(index);
  };

  const handlePrevRefund = () => {
    if (selectedIndex > 0) {
      const newIndex = selectedIndex - 1;
      setSelectedIndex(newIndex);
      setSelectedRefund(refunds[newIndex]);
    }
  };

  const handleNextRefund = () => {
    if (selectedIndex < refunds.length - 1) {
      const newIndex = selectedIndex + 1;
      setSelectedIndex(newIndex);
      setSelectedRefund(refunds[newIndex]);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-start gap-4">
        <div className="flex gap-4">
          <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 min-w-[140px]">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
              <RotateCcw size={20} />
            </div>
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t('commerce.stats.todayRefunds')}</div>
              <div className="text-lg font-bold text-zinc-900 dark:text-white">{stats.todayCount}</div>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 min-w-[140px]">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
              <DollarSign size={20} />
            </div>
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t('commerce.stats.todayRefundAmount')}</div>
              <div className="text-lg font-bold text-zinc-900 dark:text-white">¥{stats.todayAmount.toFixed(2)}</div>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 min-w-[140px]">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
              <TrendingUp size={20} />
            </div>
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t('commerce.stats.last7DaysRefunds')}</div>
              <div className="text-lg font-bold text-zinc-900 dark:text-white">{stats.last7DaysCount}</div>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 min-w-[140px]">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400">
              <DollarSign size={20} />
            </div>
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t('commerce.stats.last7DaysRefundAmount')}</div>
              <div className="text-lg font-bold text-zinc-900 dark:text-white">¥{stats.last7DaysAmount.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 items-center gap-4 w-full flex-wrap">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              placeholder={t('commerce.refundsPage.searchRefundNo')}
              value={refundNoQuery}
              onChange={(e) => setRefundNoQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              placeholder={t('commerce.refundsPage.searchOrderNo')}
              value={orderNoQuery}
              onChange={(e) => setOrderNoQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">{t('common.all')}</option>
            <option value="pending">{t('common.pending')}</option>
            <option value="processing">{t('common.processing')}</option>
            <option value="success">{t('common.success')}</option>
            <option value="failed">{t('common.failed')}</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">{t('common.all')}</option>
            <option value="full">{t('commerce.refundsPage.typeFull')}</option>
            <option value="partial">{t('commerce.refundsPage.typePartial')}</option>
          </select>

          <button type="submit" className="hidden" />
        </form>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { loadRefundList(); loadStats(); }}
            className="p-2 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
            title={t('common.refresh')}
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('commerce.refundsPage.refundNo')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('commerce.refundsPage.orderNo')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('commerce.refundsPage.customer')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('commerce.refundsPage.time')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('commerce.refundsPage.amount')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('commerce.refundsPage.type')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('commerce.refundsPage.status')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-zinc-500">
                    <RefreshCw className="animate-spin mx-auto mb-2" />
                    {t('common.loading')}
                  </td>
                </tr>
              ) : refunds.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-zinc-500">
                    {t('commerce.refundsPage.noRefunds')}
                  </td>
                </tr>
              ) : (
                refunds.map((r, index) => (
                  <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-300 font-mono">
                      {r.refund_no}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-200 font-mono">
                      {r.order?.order_no || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-300">
                      <div>{r.order?.users?.full_name || t('common.user')}</div>
                      <div className="text-xs text-zinc-400">{r.order?.users?.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                      <div className="inline-flex items-center gap-1.5">
                        <Calendar size={14} />
                        {formatDate(r.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-zinc-900 dark:text-white">
                      ¥{Number(r.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={typeBadge(r.type)}>{r.type}</span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={statusBadge(r.status)}>{r.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openDetail(r, index)}
                        className="inline-flex items-center gap-1 p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                        title={t('common.view')}
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

        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {t('common.showing')} {page} {t('common.of')} {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg disabled:opacity-50 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
            >
              {t('common.prev')}
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg disabled:opacity-50 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
            >
              {t('common.next')}
            </button>
          </div>
        </div>
      </div>

      {selectedRefund && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedRefund(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-zinc-200 dark:border-zinc-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <RotateCcw className="text-indigo-500" size={20} />
                {t('commerce.refundDetail.title')}
              </h3>
              <button
                onClick={() => setSelectedRefund(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-zinc-400 mb-1 block">{t('commerce.refundDetail.refundNo')}</label>
                  <p className="font-mono text-sm text-zinc-700 dark:text-zinc-300">{selectedRefund.refund_no}</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-zinc-400 mb-1 block">{t('commerce.refundDetail.orderNo')}</label>
                  <p className="font-mono text-sm text-zinc-700 dark:text-zinc-300">{selectedRefund.order?.order_no || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-zinc-400 mb-1 block">{t('commerce.refundDetail.status')}</label>
                  <span className={statusBadge(selectedRefund.status)}>{selectedRefund.status}</span>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-zinc-400 mb-1 block">{t('commerce.refundDetail.type')}</label>
                  <span className={typeBadge(selectedRefund.type)}>{selectedRefund.type}</span>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-zinc-400 mb-1 block">{t('commerce.refundDetail.amount')}</label>
                  <p className="font-mono text-sm text-zinc-700 dark:text-zinc-300">¥{Number(selectedRefund.amount).toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-zinc-400 mb-1 block">{t('commerce.refundDetail.date')}</label>
                  <p className="font-mono text-sm text-zinc-700 dark:text-zinc-300">{formatDate(selectedRefund.created_at)}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-zinc-400 mb-2 block">{t('commerce.refundDetail.reason')}</label>
                <div className="bg-zinc-50 dark:bg-zinc-950 rounded-lg p-4 border border-zinc-100 dark:border-zinc-800">
                  <pre className="text-xs font-mono text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{selectedRefund.reason || '-'}</pre>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between">
              <div className="flex gap-2">
                <button
                  onClick={handlePrevRefund}
                  disabled={selectedIndex <= 0}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft size={16} />
                  {t('common.prev')}
                </button>
                <button
                  onClick={handleNextRefund}
                  disabled={selectedIndex >= refunds.length - 1}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {t('common.next')}
                  <ChevronRight size={16} />
                </button>
              </div>
              <button
                onClick={() => setSelectedRefund(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-indigo-500/20"
              >
                {t('commerce.refundDetail.ok')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
