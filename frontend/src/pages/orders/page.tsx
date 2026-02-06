import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Eye, XCircle, RotateCcw, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { useI18n, useToast, usePageHeader } from '../../contexts';
import { fetchOrders, fetchRefunds, createRefund, fetchOrderStats, type Order } from '../../services/orderService';
import { fetchApps } from '../../services/appService';

const OrdersPage: React.FC = () => {
  const { t, locale } = useI18n();
  const { showToast } = useToast();
  const { setPageHeader } = usePageHeader();
  const [orders, setOrders] = useState<Order[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ todayCount: 0, todayAmount: 0, totalCount: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Refund State
  const [refunds, setRefunds] = useState<any[]>([]);
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [revokeBenefits, setRevokeBenefits] = useState(true);
  const [isRefunding, setIsRefunding] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [appFilter, setAppFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadApps = async () => {
    try {
        const data = await fetchApps();
        setApps(data || []);
    } catch (err) {
        console.error('Failed to fetch apps:', err);
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await fetchOrders({
        page,
        pageSize: 10,
        orderNo: searchQuery,
        status: statusFilter,
        appId: appFilter
      });
      setOrders(data.data || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await fetchOrderStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const loadRefunds = async (orderId: string) => {
      try {
          const data = await fetchRefunds(orderId);
          setRefunds(data || []);
      } catch (err) {
          console.error('Failed to fetch refunds:', err);
      }
  };

  useEffect(() => {
    setPageHeader(t('commerce.title'), t('commerce.subtitle'));
  }, [setPageHeader, t]);

  useEffect(() => {
    loadApps();
  }, []);

  useEffect(() => {
    loadOrders();
    loadStats();
  }, [page, statusFilter, appFilter]);

  useEffect(() => {
      if (selectedOrder) {
          loadRefunds(selectedOrder.id);
          setShowRefundForm(false);
          setRefundAmount('');
          setRefundReason('');
      }
  }, [selectedOrder]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadOrders();
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedOrder) return;
      
      setIsRefunding(true);
      try {
          const amount = parseFloat(refundAmount);
          if (isNaN(amount) || amount <= 0 || amount > selectedOrder.pay_amount) {
              showToast('Invalid refund amount', 'error');
              return;
          }

          await createRefund(selectedOrder.id, {
              amount,
              reason: refundReason,
              type: amount === selectedOrder.pay_amount ? 'full' : 'partial',
              revokeBenefits
          });
          
          showToast('Refund processed successfully', 'success');
          setShowRefundForm(false);
          loadRefunds(selectedOrder.id);
      } catch (error) {
          showToast('Failed to process refund', 'error');
      } finally {
          setIsRefunding(false);
      }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-start gap-4">
        {/* Stats Cards */}
        <div className="flex gap-4 overflow-x-auto pb-2 md:pb-0">
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 min-w-[140px]">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <Calendar size={20} />
                </div>
                <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('commerce.stats.todayOrders')}</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">{stats.todayCount}</div>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 min-w-[140px]">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                    <DollarSign size={20} />
                </div>
                <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('commerce.stats.todayRevenue')}</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">¥{stats.todayAmount.toFixed(2)}</div>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 min-w-[140px]">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400">
                    <TrendingUp size={20} />
                </div>
                <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('commerce.stats.totalOrders')}</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">{stats.totalCount}</div>
                </div>
            </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 items-center gap-4 w-full">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={t('commerce.searchPlaceholder') || 'Search Order No...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
          
          <select 
            value={appFilter}
            onChange={(e) => { setAppFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 max-w-[200px]"
          >
            <option value="">{t('commerce.source')} (All)</option>
            {apps.map((app: any) => (
                <option key={app.id} value={app.id}>{app.name}</option>
            ))}
          </select>

          <select 
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">{t('common.all')}</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="shipped">Shipped</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button type="submit" className="hidden" />
        </form>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => loadOrders()}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('commerce.txId')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('commerce.source')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('commerce.customer')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('commerce.date')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('commerce.amount')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('commerce.status')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">{t('audit.table.details')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <RefreshCw className="animate-spin mx-auto mb-2" />
                    Loading...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 font-mono">
                      {order.order_no}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">
                      {order.saas_apps?.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      <div>{order.users?.full_name || 'User'}</div>
                      <div className="text-xs text-slate-400">{order.users?.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">
                      ¥{order.pay_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide
                        ${order.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          order.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}
                      `}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
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
        
        {/* Pagination */}
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

      {/* Detail Modal */}
      {selectedOrder && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedOrder(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('commerce.detail.title')}</h3>
                <button 
                  onClick={() => setSelectedOrder(null)} 
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                    <XCircle size={20} />
                </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 block mb-1">{t('commerce.detail.orderNo')}</label>
                        <div className="font-mono text-sm dark:text-white">{selectedOrder.order_no}</div>
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 block mb-1">{t('commerce.detail.transactionId')}</label>
                        <div className="font-mono text-sm dark:text-white">{selectedOrder.transaction_id || '-'}</div>
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 block mb-1">{t('commerce.detail.status')}</label>
                        <div className="font-bold text-sm dark:text-white">{selectedOrder.status}</div>
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 block mb-1">{t('commerce.detail.provisionStatus')}</label>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            selectedOrder.provision_status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 
                            'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                            {selectedOrder.provision_status || 'pending'}
                        </span>
                    </div>
                     <div>
                        <label className="text-xs font-bold uppercase text-slate-500 block mb-1">{t('commerce.detail.amount')}</label>
                        <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                            {selectedOrder.currency || 'CNY'} {selectedOrder.pay_amount.toFixed(2)}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 block mb-1">{t('commerce.detail.paymentChannel')}</label>
                        <div className="text-sm dark:text-white capitalize">{selectedOrder.payment_channel || '-'}</div>
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 block mb-1">{t('commerce.detail.plan')}</label>
                        <div className="text-sm dark:text-white font-mono">{selectedOrder.plan_key || '-'}</div>
                    </div>
                     <div>
                        <label className="text-xs font-bold uppercase text-slate-500 block mb-1">{t('commerce.detail.date')}</label>
                        <div className="text-sm dark:text-white">{formatDate(selectedOrder.created_at)}</div>
                    </div>
                    <div className="col-span-2">
                        <label className="text-xs font-bold uppercase text-slate-500 block mb-1">{t('commerce.detail.customer')}</label>
                        <div className="text-sm dark:text-white">
                            {selectedOrder.users?.full_name} <span className="text-slate-400">&lt;{selectedOrder.users?.email}&gt;</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">IP: {selectedOrder.client_ip || '-'}</div>
                    </div>
                </div>
                
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                    <label className="text-xs font-bold uppercase text-slate-500 block mb-2">{t('commerce.detail.items')}</label>
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                        <pre className="text-xs whitespace-pre-wrap font-mono dark:text-slate-300">
                            {JSON.stringify(selectedOrder.items_snapshot, null, 2)}
                        </pre>
                    </div>
                </div>

                {/* Refunds Section */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-xs font-bold uppercase text-slate-500">{t('commerce.refunds')}</label>
                        {!showRefundForm && (selectedOrder.status === 'paid' || selectedOrder.status === 'completed' || selectedOrder.status === 'shipped') && (
                            <button 
                                onClick={() => setShowRefundForm(true)}
                                className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
                            >
                                <RotateCcw size={14} />
                                {t('commerce.refundAction')}
                            </button>
                        )}
                    </div>

                    {showRefundForm && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg mb-4 animate-in slide-in-from-top-2">
                            <form onSubmit={handleRefundSubmit} className="space-y-3">
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">{t('commerce.amount')} (Max: ¥{selectedOrder.pay_amount})</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        max={selectedOrder.pay_amount}
                                        value={refundAmount}
                                        onChange={e => setRefundAmount(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder={t('commerce.refundAmountPlaceholder')}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">{t('commerce.refundReason')}</label>
                                    <input 
                                        type="text" 
                                        value={refundReason}
                                        onChange={e => setRefundReason(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder={t('commerce.refundReasonPlaceholder')}
                                        required
                                    />
                                </div>
                                <div className="flex items-center gap-2 px-1">
                                    <input 
                                        type="checkbox" 
                                        id="revokeBenefits"
                                        checked={revokeBenefits}
                                        onChange={e => setRevokeBenefits(e.target.checked)}
                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                                    />
                                    <label htmlFor="revokeBenefits" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer font-medium">
                                        同步回收对应的 AI 权益 (如积分)
                                    </label>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button 
                                        type="button"
                                        onClick={() => setShowRefundForm(false)}
                                        className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={isRefunding}
                                        className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {isRefunding ? t('common.processing') : t('commerce.confirmRefund')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {refunds.length > 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('commerce.refundNo')}</th>
                                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('commerce.refundReason')}</th>
                                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('commerce.amount')}</th>
                                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('commerce.status')}</th>
                                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">{t('commerce.date')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {refunds.map((refund: any) => (
                                            <tr key={refund.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 font-mono">
                                                    {refund.refund_no}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                                                    {refund.reason}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-bold text-slate-900 dark:text-white">
                                                    ¥{refund.amount}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide
                                                        ${refund.status === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-200 text-slate-600'}
                                                    `}>
                                                        {refund.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm text-slate-500 dark:text-slate-400">
                                                    {new Date(refund.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4 text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-800/30 rounded-lg">
                            {t('commerce.noRefunds')}
                        </div>
                    )}
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
