import React from 'react';
import { Key, RefreshCw, EyeOff, Eye, Copy, Cpu, Edit2, Trash2 } from 'lucide-react';
import { type SaaSApp, AppStatus } from '../../../types';
import { useI18n } from '../../../contexts';

interface AppDetailProps {
  app: SaaSApp | null;
  showSecret: boolean;
  setShowSecret: (show: boolean) => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
  onRotateSecret: () => void;
  isRotating?: boolean;
}

const StatusBadge = ({ status }: { status: AppStatus }) => {
  const { t } = useI18n();
  const styles = {
    [AppStatus.ACTIVE]: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    [AppStatus.DEVELOPMENT]:
      'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    [AppStatus.SUSPENDED]: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800',
  };
  const localeKey = `apps.status.${status.toLowerCase()}`;

  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>{t(localeKey)}</span>;
};

const CopyField = ({ label, value }: { label: string; value: string }) => (
  <div className="group relative">
    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">{label}</label>
    <div className="flex items-center gap-2">
      <code className="bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-md text-zinc-700 dark:text-zinc-300 font-mono text-sm flex-1 truncate border border-zinc-200 dark:border-zinc-700">
        {value}
      </code>
      <button className="p-2 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" onClick={() => navigator.clipboard.writeText(value)}>
        <Copy size={16} />
      </button>
    </div>
  </div>
);

export const AppDetail: React.FC<AppDetailProps> = ({
  app,
  showSecret,
  setShowSecret,
  onEdit,
  onDelete,
  onRotateSecret,
  isRotating = false
}) => {
  const { t } = useI18n();

  if (!app) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-900/50">
      {/* Header */}
      <div className="p-8 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-10">
        <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-lg bg-indigo-600 shadow-xl shadow-indigo-600/20 flex items-center justify-center text-white">
                    <span className="text-3xl font-black">{app.name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                    <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">{app.name}</h2>
                    <div className="flex items-center gap-3">
                        <StatusBadge status={app.status} />
                        <span className="text-sm font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">{app.id}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={onEdit} 
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                    <Edit2 size={16} strokeWidth={2.5} />
                    {t('common.edit')}
                </button>
                <button 
                    onClick={() => onDelete(app.id)} 
                    className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                >
                    <Trash2 size={20} />
                </button>
            </div>
        </div>
        <p className="mt-6 text-zinc-600 dark:text-zinc-400 text-lg leading-relaxed max-w-3xl">
            {app.description || t('apps.placeholders.description')}
        </p>
      </div>

      <div className="p-8 space-y-8 flex-1 overflow-y-auto">
          {/* Credentials */}
          <section className="bg-white dark:bg-zinc-900 rounded-lg p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 dark:text-amber-500">
                <Key size={20} strokeWidth={2.5} />
              </div>
              <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{t('apps.credentials')}</h3>
                  <p className="text-sm text-zinc-500">{t('apps.credentialsDesc')}</p>
              </div>
            </div>

            <div className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CopyField label={t('apps.appId')} value={app.id} />
                    <CopyField label={t('apps.pubKey')} value={app.apiKey} />
                </div>
              
              <div className="p-6 bg-zinc-50 dark:bg-zinc-950/50 rounded-lg border border-zinc-100 dark:border-zinc-800 group relative overflow-hidden">
                <div className="flex justify-between items-center mb-4 relative z-10">
                    <div>
                        <label className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-1 block">{t('apps.secretKey')}</label>
                        <p className="text-xs text-zinc-500">{t('apps.serverSideOnly')}</p>
                    </div>
                    <button 
                        onClick={onRotateSecret}
                        disabled={isRotating}
                        className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center gap-2 shadow-sm"
                    >
                        {isRotating ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />} 
                        {t('common.rotate')}
                    </button>
                </div>
                
                <div className="flex items-center gap-3 relative z-10">
                    <code className="flex-1 block bg-white dark:bg-zinc-900 px-4 py-3 rounded-lg text-zinc-800 dark:text-zinc-200 font-mono text-sm border border-zinc-200 dark:border-zinc-800 shadow-inner break-all">
                        {showSecret ? app.apiSecret : '•'.repeat(40)}
                    </code>
                    <button 
                        className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-400 hover:text-indigo-600 hover:border-indigo-500 transition-all shadow-sm" 
                        onClick={() => setShowSecret(!showSecret)}
                    >
                        {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    <button 
                        className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-400 hover:text-indigo-600 hover:border-indigo-500 transition-all shadow-sm" 
                        onClick={() => navigator.clipboard.writeText(app.apiSecret)}
                    >
                        <Copy size={18} />
                    </button>
                </div>
                
                <div className="mt-4 flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-lg inline-flex">
                    <span className="font-bold text-xs uppercase tracking-wider">{t('apps.warning')}</span>
                    <span className="text-xs opacity-80">{t('apps.secretWarning')}</span>
                </div>
              </div>
            </div>
          </section>

          {/* AI Configuration */}
          <section className="bg-white dark:bg-zinc-900 rounded-lg p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Cpu size={20} strokeWidth={2.5} />
              </div>
              <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{t('apps.intelligence')}</h3>
                  <p className="text-sm text-zinc-500">{t('apps.aiModelDesc')}</p>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{t('apps.selectedModel')}</span>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <code className="text-sm font-bold text-zinc-900 dark:text-white">{app.aiModelConfig || t('apps.defaultModel')}</code>
                </div>
            </div>
          </section>
      </div>
    </div>
  );
};
