
import React, { useState, useEffect } from 'react';
import { DollarSign, Download, ExternalLink, Filter, Search, AppWindow, Calendar, CreditCard, ChevronLeft, ChevronRight, CheckCircle, Clock, XCircle } from 'lucide-react';
import { RECENT_TRANSACTIONS, MOCK_APPS } from '../../constants';
import { useI18n } from '../../contexts';
import { Transaction } from '../../types';

export const OrderCenterPage: React.FC = () => {
  const { t } = useI18n();

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppId, setSelectedAppId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedAppId, selectedStatus, itemsPerPage]);

  // Filtering Logic
  const filteredTransactions = RECENT_TRANSACTIONS.filter(tx => {
    const matchesSearch = tx.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tx.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesApp = selectedAppId === 'all' || tx.appId === selectedAppId;
    const matchesStatus = selectedStatus === 'all' || tx.status === selectedStatus;

    return matchesSearch && matchesApp && matchesStatus;
  });

  // Pagination Logic
  const totalItems = filteredTransactions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'succeeded': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'failed': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'succeeded': return <CheckCircle size={14} className="mr-1" />;
      case 'pending': return <Clock size={14} className="mr-1" />;
      case 'failed': return <XCircle size={14} className="mr-1" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('commerce.title')}</h2>
           <p className="text-slate-500 dark:text-slate-400 mt-1">{t('commerce.subtitle')}</p>
        </div>
        <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors">
                <ExternalLink size={16} /> {t('commerce.stripe')}
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors">
                <Download size={16} /> {t('commerce.export')}
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-200">
        
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex flex-wrap gap-4 w-full xl:w-auto">
                {/* Search */}
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('common.filter') + " ID, Email..."}
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                {/* App Filter */}
                <div className="relative min-w-[180px]">
                    <select 
                        value={selectedAppId}
                        onChange={(e) => setSelectedAppId(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                    >
                        <option value="all">{t('common.allApps')}</option>
                        {MOCK_APPS.map(app => (
                            <option key={app.id} value={app.id}>{app.name}</option>
                        ))}
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <AppWindow size={16} />
                    </div>
                </div>

                {/* Status Filter */}
                <div className="relative min-w-[160px]">
                    <select 
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                    >
                        <option value="all">{t('common.allStatus')}</option>
                        <option value="succeeded">{t('commerce.statusMap.succeeded')}</option>
                        <option value="pending">{t('commerce.statusMap.pending')}</option>
                        <option value="failed">{t('commerce.statusMap.failed')}</option>
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <Filter size={16} />
                    </div>
                </div>
            </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3 font-medium">{t('commerce.txId')}</th>
                <th className="px-6 py-3 font-medium">{t('commerce.source')}</th>
                <th className="px-6 py-3 font-medium">{t('commerce.customer')}</th>
                <th className="px-6 py-3 font-medium">{t('commerce.date')}</th>
                <th className="px-6 py-3 font-medium">{t('commerce.amount')}</th>
                <th className="px-6 py-3 font-medium">{t('commerce.status')}</th>
                <th className="px-6 py-3 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-400">{tx.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded text-indigo-600 dark:text-indigo-400">
                            <AppWindow size={14} />
                        </div>
                        <div>
                            <span className="font-medium text-slate-900 dark:text-slate-200 block">{tx.appName}</span>
                            <span className="text-xs text-slate-400 font-mono">{tx.appId}</span>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-500">
                            {tx.customerEmail.charAt(0).toUpperCase()}
                        </div>
                        {tx.customerEmail}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        {new Date(tx.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white font-mono">
                    ${tx.amount.toFixed(2)} <span className="text-slate-400 text-xs">{tx.currency}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(tx.status)}`}>
                      {getStatusIcon(tx.status)}
                      {t(`commerce.statusMap.${tx.status}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        <ExternalLink size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                        <div className="flex flex-col items-center justify-center">
                            <Search size={32} className="text-slate-300 mb-2" />
                            <p>No transactions found matching your filters.</p>
                        </div>
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-400">
             <div className="flex items-center gap-4">
                <span>
                   {t('common.showing')} <span className="font-medium text-slate-900 dark:text-white">{Math.min(startIndex + 1, totalItems)}</span> {t('common.to')} <span className="font-medium text-slate-900 dark:text-white">{Math.min(endIndex, totalItems)}</span> {t('common.of')} <span className="font-medium text-slate-900 dark:text-white">{totalItems}</span> {t('common.results')}
                </span>
                
                <div className="flex items-center gap-2">
                    <span className="hidden sm:inline">{t('common.rowsPerPage')}:</span>
                    <select 
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
             </div>

             <div className="flex items-center gap-2">
                <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                    <ChevronLeft size={16} /> {t('common.prev')}
                </button>
                <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                    {t('common.next')} <ChevronRight size={16} />
                </button>
             </div>
        </div>
      </div>
    </div>
  );
};
