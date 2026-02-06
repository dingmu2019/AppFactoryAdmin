import React from 'react';
import { useI18n } from '../contexts';

export const ComingSoon: React.FC = () => {
  const { t } = useI18n();
  
  return (
    <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400 dark:text-slate-500">
      <h2 className="text-xl font-medium">{t('common.comingSoon')}</h2>
      <p>{t('common.devMessage')}</p>
    </div>
  );
};
