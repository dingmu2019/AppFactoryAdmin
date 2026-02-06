import React from 'react';
import { DollarSign, Download, ExternalLink, Filter } from 'lucide-react';
import { RECENT_TRANSACTIONS } from '../constants';
import { useI18n } from '../contexts';

export const Commerce: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
            <h3 className="font-semibold text-slate-900 dark:text-white">{t('commerce.recentTx')}</h3>
            <button className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200">
                <Filter size={16} /> {t('common.filter')}
            </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3 font-medium">{t('commerce.txId')}</th>
                <th className="px-6 py-3 font-medium">{t('commerce.source')}</th>
                <th className="px-6 py-3 font-medium">{t('commerce.customer')}</th>
                <th className="px-6 py-3 font-medium">{t('commerce.date')}</th>
                <th className="px-6 py-3 font-medium">{t('commerce.amount')}</th>
                <th className="px-6 py-3 font-medium">{t('commerce.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {RECENT_TRANSACTIONS.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-400">{tx.id}</td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-900 dark:text-slate-200 block">{tx.appName}</span>
                    <span className="text-xs text-slate-400 font-mono">{tx.appId}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{tx.customerEmail}</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                    {new Date(tx.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    ${tx.amount.toFixed(2)} {tx.currency}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                      ${tx.status === 'succeeded' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                        tx.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 
                        'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                      {t(`commerce.statusMap.${tx.status}`)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-center">
            <button className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
                {t('common.viewAll')}
            </button>
        </div>
      </div>
    </div>
  );
};