import React from 'react';
import { Edit2, Settings, Trash2, Box, Clock } from 'lucide-react';
import { type SaaSApp, AppStatus } from '../../../types';
import { useI18n } from '../../../contexts';

interface AppCardProps {
  app: SaaSApp;
  onEdit: (app: SaaSApp) => void;
  onDelete: (id: string) => void;
  onViewSettings: (app: SaaSApp) => void;
}

export const AppCard: React.FC<AppCardProps> = ({ app, onEdit, onDelete, onViewSettings }) => {
  const { t } = useI18n();

  return (
    <div className="group relative bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:shadow-xl hover:border-indigo-500/30 transition-all duration-300 overflow-hidden flex flex-col h-full">
      {/* Status Badge */}
      <div className="absolute top-4 right-4 flex gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${app.status === AppStatus.ACTIVE ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
      </div>

      <div className="p-6 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Box size={28} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white truncate cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => onViewSettings(app)}>
              {app.name}
            </h3>
            <p className="text-xs font-mono text-zinc-400 mt-1 truncate">
              {app.id}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-6 flex-1">
          {app.description || t('apps.placeholders.description')}
        </p>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-zinc-50 dark:bg-zinc-950/50 rounded-lg p-3 border border-zinc-100 dark:border-zinc-800">
                <div className="text-[10px] uppercase font-bold text-zinc-400 mb-1">{t('apps.aiModel')}</div>
                <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                    {app.aiModelConfig || '-'}
                </div>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-950/50 rounded-lg p-3 border border-zinc-100 dark:border-zinc-800">
                <div className="text-[10px] uppercase font-bold text-zinc-400 mb-1">{t('apps.users')}</div>
                <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {app.totalUsers || 0}
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-auto">
            <div className="flex items-center gap-1.5">
                <Clock size={14} />
                <span>{new Date(app.createdAt).toLocaleDateString()}</span>
            </div>
        </div>
      </div>

      {/* Actions Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-t border-zinc-100 dark:border-zinc-800 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-between z-10">
         <button
            onClick={() => onViewSettings(app)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
         >
            <Settings size={16} />
            {t('common.settings')}
         </button>
         
         <div className="flex gap-2">
            <button
                onClick={() => onEdit(app)}
                className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors"
                title={t('common.edit')}
            >
                <Edit2 size={18} />
            </button>
            <button
                onClick={() => onDelete(app.id)}
                className="p-2 text-zinc-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 rounded-lg transition-colors"
                title={t('common.delete')}
            >
                <Trash2 size={18} />
            </button>
         </div>
      </div>
    </div>
  );
};
