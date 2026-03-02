
'use client';

import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Eye, XCircle, RotateCcw, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { useI18n, useToast, usePageHeader } from '@/contexts';
import { fetchOrders, fetchRefunds, createRefund, fetchOrderStats, type Order } from '@/services/orderService';
import { fetchApps } from '@/services/appService';

const OrdersPage: React.FC = () => {
  const { t, locale } = useI18n();
  const { showToast } = useToast();
  const { setPageHeader } = usePageHeader();
  const [orders, setOrders] = useState<Order[]>([]);
  const [apps, setApps] = useState<any[]>([]);
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
      setStats({
        todayCount: data.todayCount || 0,
        todayAmount: data.todayAmount || 0,
        last7DaysCount: data.last7DaysCount || 0,
        last7DaysAmount: data.last7DaysAmount || 0,
        totalCount: data.totalCount || 0
      });
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
              showToast(t('commerce.invalidRefundAmount'), 'error');
              return;
          }

          await createRefund(selectedOrder.id, {
              amount,
              reason: refundReason,
              type: amount === selectedOrder.pay_amount ? 'full' : 'partial',
              revokeBenefits
          });
          
          showToast(t('commerce.refundSuccess'), 'success');
          setShowRefundForm(false);
          loadRefunds(selectedOrder.id);
      } catch (error) {
          showToast(t('commerce.refundFailed'), 'error');
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-start gap-4">
        {/* Stats Cards */}
        <div className="flex gap-4">
            <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 min-w-[140px]">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <Calendar size={20} />
                </div>
                <div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t('commerce.stats.todayOrders')}</div>
                    <div className="text-lg font-bold text-zinc-900 dark:text-white">{stats.todayCount}</div>
                </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 min-w-[140px]">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                    <DollarSign size={20} />
                </div>
                <div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t('commerce.stats.todayRevenue')}</div>
                    <div className="text-lg font-bold text-zinc-900 dark:text-white">¥{stats.todayAmount.toFixed(2)}</div>
                </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 min-w-[140px]">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                    <TrendingUp size={20} />
                </div>
                <div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t('commerce.stats.last7DaysCount')}</div>
                    <div className="text-lg font-bold text-zinc-900 dark:text-white">{stats.last7DaysCount}</div>
                </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 min-w-[140px]">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400">
                    <DollarSign size={20} />
                </div>
                <div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t('commerce.stats.last7DaysAmount')}</div>
                    <div className="text-lg font-bold text-zinc-900 dark:text-white">¥{stats.last7DaysAmount.toFixed(2)}</div>
                </div>
            </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 items-center gap-4 w-full">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder={t('commerce.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
          
          <select 
            value={appFilter}
            onChange={(e) => { setAppFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500 max-w-[200px]"
          >
            <option value="">{t('commerce.source')} ({t('common.all')})</option>
            {apps.map((app: any) => (
                <option key={app.id} value={app.id}>{app.name}</option>
            ))}
          </select>

          <select 
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">{t('commerce.allStatus')}</option>
            <option value="pending">{t('commerce.statusPending')}</option>
            <option value="paid">{t('commerce.statusPaid')}</option>
            <option value="shipped">{t('commerce.statusShipped')}</option>
            <option value="cancelled">{t('commerce.statusCancelled')}</option>
          </select>
          <button type="submit" className="hidden" />
        </form>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => loadOrders()}
            className="p-2 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
            title={t('common.refresh')}
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('commerce.txId')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('commerce.source')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('commerce.customer')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('commerce.date')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('commerce.amount')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('commerce.status')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 text-right">{t('audit.table.details')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    <RefreshCw className="animate-spin mx-auto mb-2" />
                    {t('common.loading')}
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    {t('commerce.noOrders')}
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-300 font-mono">
                      {order.order_no}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-200">
                      {order.saas_apps?.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-300">
                      <div>{order.users?.full_name || t('common.user')}</div>
                      <div className="text-xs text-zinc-400">{order.users?.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-zinc-900 dark:text-white">
                      ¥{order.pay_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide
                        ${order.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          order.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'}
                      `}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
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

      {/* Detail Modal */}
      {selectedOrder && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedOrder(null)}
        >
          <div 
            className="bg-white dark:bg-zinc-900 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{t('commerce.detail.title')}</h3>
                <button 
                  onClick={() => setSelectedOrder(null)} 
                  className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                    <XCircle size={20} />
                </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold uppercase text-zinc-500 block mb-1">{t('commerce.detail.orderNo')}</label>
                        <div className="font-mono text-sm dark:text-white">{selectedOrder.order_no}</div>
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-zinc-500 block mb-1">{t('commerce.detail.transactionId')}</label>
                        <div className="font-mono text-sm dark:text-white">{selectedOrder.transaction_id || '-'}</div>
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-zinc-500 block mb-1">{t('commerce.detail.status')}</label>
                        <div className="font-bold text-sm dark:text-white">{selectedOrder.status}</div>
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-zinc-500 block mb-1">{t('commerce.detail.provisionStatus')}</label>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            selectedOrder.provision_status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 
                            'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                            {selectedOrder.provision_status === 'completed' ? t('common.completed') : t('common.pending')}
                        </span>
                    </div>
                     <div>
                        <label className="text-xs font-bold uppercase text-zinc-500 block mb-1">{t('commerce.detail.amount')}</label>
                        <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                            {selectedOrder.currency || 'CNY'} {selectedOrder.pay_amount.toFixed(2)}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-zinc-500 block mb-1">{t('commerce.detail.paymentChannel')}</label>
                        <div className="text-sm dark:text-white capitalize">{selectedOrder.payment_channel || '-'}</div>
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-zinc-500 block mb-1">{t('commerce.detail.plan')}</label>
                        <div className="text-sm dark:text-white font-mono">{selectedOrder.plan_key || '-'}</div>
                    </div>
                     <div>
                        <label className="text-xs font-bold uppercase text-zinc-500 block mb-1">{t('commerce.detail.date')}</label>
                        <div className="text-sm dark:text-white">{formatDate(selectedOrder.created_at)}</div>
                    </div>
                    <div className="col-span-2">
                        <label className="text-xs font-bold uppercase text-zinc-500 block mb-1">{t('commerce.detail.customer')}</label>
                        <div className="text-sm dark:text-white">
                            {selectedOrder.users?.full_name} <span className="text-zinc-400">&lt;{selectedOrder.users?.email}&gt;</span>
                        </div>
                        <div className="text-xs text-zinc-400 mt-0.5">IP: {selectedOrder.client_ip || '-'}</div>
                    </div>
                </div>
                
                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
                    <label className="text-xs font-bold uppercase text-zinc-500 block mb-2">{t('commerce.detail.items')}</label>
                    <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg">
                        <pre className="text-xs whitespace-pre-wrap font-mono dark:text-zinc-300">
                            {JSON.stringify(selectedOrder.items_snapshot, null, 2)}
                        </pre>
                    </div>
                </div>

                {/* Refunds Section */}
                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-xs font-bold uppercase text-zinc-500">{t('commerce.refunds')}</label>
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
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg mb-4 animate-in slide-in-from-top-2">
                            <form onSubmit={handleRefundSubmit} className="space-y-3">
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1 block">{t('commerce.amount')} (Max: ¥{selectedOrder.pay_amount})</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        max={selectedOrder.pay_amount}
                                        value={refundAmount}
                                        onChange={e => setRefundAmount(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder={t('commerce.refundAmountPlaceholder')}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1 block">{t('commerce.refundReason')}</label>
                                    <input 
                                        type="text" 
                                        value={refundReason}
                                        onChange={e => setRefundReason(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
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
                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800"
                                    />
                                    <label htmlFor="revokeBenefits" className="text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer font-medium">
                                        {t('commerce.revokeBenefits')}
                                    </label>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button 
                                        type="button"
                                        onClick={() => setShowRefundForm(false)}
                                        className="px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg"
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
                        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
                                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('commerce.refundNo')}</th>
                                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('commerce.refundReason')}</th>
                                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('commerce.amount')}</th>
                                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('commerce.status')}</th>
                                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 text-right">{t('commerce.date')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                        {refunds.map((refund: any) => (
                                            <tr key={refund.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300 font-mono">
                                                    {refund.refund_no}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300">
                                                    {refund.reason}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-bold text-zinc-900 dark:text-white">
                                                    ¥{refund.amount}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide
                                                        ${refund.status === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-zinc-200 text-zinc-600'}
                                                    `}>
                                                        {refund.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm text-zinc-500 dark:text-zinc-400">
                                                    {new Date(refund.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4 text-zinc-400 text-xs italic bg-zinc-50 dark:bg-zinc-800/30 rounded-lg">
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
