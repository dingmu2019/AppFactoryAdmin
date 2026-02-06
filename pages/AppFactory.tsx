import React, { useState } from 'react';
import { Plus, MoreVertical, Copy, Key, Globe, Database, Cpu, AppWindow } from 'lucide-react';
import { MOCK_APPS } from '../constants';
import { AppStatus, SaaSApp } from '../types';
import { useI18n } from '../contexts';

export const AppFactory: React.FC = () => {
  const [selectedApp, setSelectedApp] = useState<SaaSApp | null>(null);
  const { t } = useI18n();

  const StatusBadge = ({ status }: { status: AppStatus }) => {
    const styles = {
      [AppStatus.ACTIVE]: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
      [AppStatus.DEVELOPMENT]: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
      [AppStatus.SUSPENDED]: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800',
    };
    // Map status enum to locale key. 
    // Note: Assuming AppStatus values match keys in locales 'active', 'development', etc.
    const localeKey = `apps.status.${status.toLowerCase()}`;

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
        {t(localeKey)}
      </span>
    );
  };

  const CopyField = ({ label, value }: { label: string, value: string }) => (
    <div className="group relative">
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">{label}</label>
      <div className="flex items-center gap-2">
        <code className="bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-md text-slate-700 dark:text-slate-300 font-mono text-sm flex-1 truncate border border-slate-200 dark:border-slate-700">
          {value}
        </code>
        <button 
          className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          onClick={() => navigator.clipboard.writeText(value)}
        >
          <Copy size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      {/* List Column */}
      <div className="w-full lg:w-1/3 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden transition-colors duration-200">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white">{t('apps.yourApps')}</h3>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus size={16} /> {t('common.newApp')}
          </button>
        </div>
        <div className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-2">
          {MOCK_APPS.map(app => (
            <div 
              key={app.id}
              onClick={() => setSelectedApp(app)}
              className={`p-4 rounded-lg cursor-pointer transition-all border ${
                selectedApp?.id === app.id 
                  ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800 shadow-sm' 
                  : 'bg-white dark:bg-slate-900 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className={`font-semibold ${selectedApp?.id === app.id ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-900 dark:text-slate-200'}`}>
                  {app.name}
                </h4>
                <StatusBadge status={app.status} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{app.description}</p>
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1"><Globe size={12}/> {app.totalUsers} {t('apps.users')}</span>
                <span className="flex items-center gap-1"><Database size={12}/> {app.id}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Column */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden transition-colors duration-200">
        {selectedApp ? (
          <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
            {/* Detail Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedApp.name}</h2>
                    <StatusBadge status={selectedApp.status} />
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">{selectedApp.description}</p>
                </div>
                <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Config Sections */}
            <div className="p-6 space-y-8">
              {/* Credentials */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Key className="text-indigo-600 dark:text-indigo-400" size={20} />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('apps.credentials')}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <CopyField label={t('apps.appId')} value={selectedApp.id} />
                  <CopyField label={t('apps.pubKey')} value={selectedApp.apiKey} />
                  <div className="md:col-span-2">
                    <CopyField label={t('apps.secretKey')} value={selectedApp.apiSecret} />
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                      {t('apps.secretWarning')}
                    </p>
                  </div>
                </div>
              </section>

              {/* AI & Integration */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Cpu className="text-indigo-600 dark:text-indigo-400" size={20} />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('apps.intelligence')}</h3>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
                   <div className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-200">{t('apps.aiModel')}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{t('apps.aiModelDesc')}</p>
                      </div>
                      <select 
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none"
                        defaultValue={selectedApp.aiModelConfig}
                      >
                        <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                        <option value="gemini-3-pro-preview">Gemini 3 Pro</option>
                        <option value="gemini-3-pro-image-preview">Gemini 3 Image Pro</option>
                        <option value="gpt-4-turbo">GPT-4 Turbo (Legacy)</option>
                      </select>
                   </div>
                   
                   <div className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-200">{t('apps.difyBinding')}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{t('apps.difyBindingDesc')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                         <input 
                           type="text" 
                           defaultValue={selectedApp.difyAppId || ''} 
                           placeholder="Dify App ID"
                           className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-sm rounded-lg p-2.5 w-40 outline-none"
                         />
                         <button className="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline">{t('apps.verify')}</button>
                      </div>
                   </div>
                </div>
              </section>

              {/* Webhooks (Mock) */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="text-indigo-600 dark:text-indigo-400" size={20} />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('apps.webhooks')}</h3>
                </div>
                <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-full mb-3">
                     <Globe className="text-slate-400" size={24} />
                  </div>
                  <h4 className="text-slate-900 dark:text-white font-medium">{t('apps.noWebhooks')}</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{t('apps.noWebhooksDesc')}</p>
                  <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
                    {t('apps.addEndpoint')}
                  </button>
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
            <AppWindow size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">{t('apps.selectApp')}</p>
            <p className="text-sm">{t('apps.selectAppDesc')}</p>
          </div>
        )}
      </div>
    </div>
  );
};