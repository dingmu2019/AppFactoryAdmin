import React from 'react';
import { useI18n } from '../../contexts';

export default function OrderRefundsPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('common.orderRefund')}</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{t('common.devMessage')}</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 dark:text-slate-400">
        {t('common.comingSoon')}
      </div>
    </div>
  );
}
