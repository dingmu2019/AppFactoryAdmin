import React, { useEffect, useState } from 'react';
import { RotateCcw, Search, RefreshCw, Eye, XCircle, Calendar, DollarSign, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n, useToast, usePageHeader } from '../../../contexts';
import { fetchRefunds, fetchRefundStats } from '../../../services/refundService';
import type { RefundItem } from '../../../services/refundService';

const OrderRefundsPage: React.FC = () => {
  const { t, locale } = useI18n();
  const { showToast } = useToast();
  const { setPageHeader } = usePageHeader();

  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ todayCount: 0, todayAmount: 0, totalCount: 0 });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [refundNoQuery, setRefundNoQuery] = useState('');
  const [orderNoQuery, setOrderNoQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [selectedRefund, setSelectedRefund] = useState<RefundItem | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

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

  const openDetail = (refund: RefundItem, index: number) => {
    setSelectedRefund(refund);
    setSelectedIndex(index);
  };

  const loadRefunds = async () => {
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
      showToast(err.message || '加载退款列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await fetchRefundStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch refund stats:', err);
    }
  };

  useEffect(() => {
    setPageHeader(t('common.orderRefund'), '退款明细与统计');
  }, [setPageHeader, t]);

  useEffect(() => {
    loadRefunds();
    loadStats();
  }, [page, statusFilter, typeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadRefunds();
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
    if (type === 'full') return `${base} bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300`;
    if (type === 'partial') return `${base} bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400`;
    return `${base} bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-start gap-4">
        <div className="flex gap-4">
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 min-w-[160px]">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Calendar size={20} />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">今日退款笔数</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{stats.todayCount}</div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 min-w-[200px]">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
              <DollarSign size={20} />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">今日退款金额（成功）</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">¥{stats.todayAmount.toFixed(2)}</div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 min-w-[160px]">
            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
              <TrendingUp size={20} />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">累计退款笔数</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{stats.totalCount}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 items-center gap-4 w-full flex-wrap">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="退款单号..."
              value={refundNoQuery}
              onChange={(e) => setRefundNoQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="订单号..."
              value={orderNoQuery}
              onChange={(e) => setOrderNoQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">{t('common.all')}</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">{t('common.all')}</option>
            <option value="full">Full</option>
            <option value="partial">Partial</option>
          </select>

          <button type="submit" className="hidden" />
        </form>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { loadRefunds(); loadStats(); }}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">退款单号</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">订单号</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">客户</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">时间</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">金额</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">类型</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">状态</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    <RefreshCw className="animate-spin mx-auto mb-2" />
                    加载中...
                  </td>
                </tr>
              ) : refunds.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    暂无退款记录
                  </td>
                </tr>
              ) : (
                refunds.map((r, index) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 font-mono">
                      {r.refund_no}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200 font-mono">
                      {r.order?.order_no || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      <div>{r.order?.users?.full_name || 'User'}</div>
                      <div className="text-xs text-slate-400">{r.order?.users?.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(r.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">
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
                        className="inline-flex items-center gap-1 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                        title="查看"
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

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {t('common.showing')} {page} {t('common.of')} {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              {t('common.prev')}
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
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
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-slate-200 dark:border-slate-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <RotateCcw className="text-indigo-500" size={20} />
                {t('commerce.refundDetail.title')}
              </h3>
              <button
                onClick={() => setSelectedRefund(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 mb-1 block">{t('commerce.refundDetail.refundNo')}</label>
                  <p className="font-mono text-sm text-slate-700 dark:text-slate-300">{selectedRefund.refund_no}</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 mb-1 block">{t('commerce.refundDetail.orderNo')}</label>
                  <p className="font-mono text-sm text-slate-700 dark:text-slate-300">{selectedRefund.order?.order_no || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 mb-1 block">{t('commerce.refundDetail.status')}</label>
                  <span className={statusBadge(selectedRefund.status)}>{selectedRefund.status}</span>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 mb-1 block">{t('commerce.refundDetail.type')}</label>
                  <span className={typeBadge(selectedRefund.type)}>{selectedRefund.type}</span>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 mb-1 block">{t('commerce.refundDetail.amount')}</label>
                  <p className="font-mono text-sm text-slate-700 dark:text-slate-300">¥{Number(selectedRefund.amount).toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 mb-1 block">{t('commerce.refundDetail.date')}</label>
                  <p className="font-mono text-sm text-slate-700 dark:text-slate-300">{formatDate(selectedRefund.created_at)}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-400 mb-2 block">{t('commerce.refundDetail.reason')}</label>
                <div className="bg-slate-50 dark:bg-slate-950 rounded-lg p-4 border border-slate-100 dark:border-slate-800">
                  <pre className="text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{selectedRefund.reason || '-'}</pre>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between">
              <div className="flex gap-2">
                <button
                  onClick={handlePrevRefund}
                  disabled={selectedIndex <= 0}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft size={16} />
                  {t('common.prev')}
                </button>
                <button
                  onClick={handleNextRefund}
                  disabled={selectedIndex >= refunds.length - 1}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
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
};

export default OrderRefundsPage;
