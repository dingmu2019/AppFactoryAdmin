
import React, { useState } from 'react';
import { Plus, MoreVertical, Copy, Key, Globe, Database, Cpu, AppWindow, Edit2, Trash2, X, Check } from 'lucide-react';
import { MOCK_APPS } from '../../constants';
import { AppStatus, SaaSApp } from '../../types';
import { useI18n } from '../../contexts';
import { ConfirmModal } from '../../components/ConfirmModal';

export const AppManagerPage: React.FC = () => {
  const [apps, setApps] = useState<SaaSApp[]>(MOCK_APPS);
  const [selectedApp, setSelectedApp] = useState<SaaSApp | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Partial<SaaSApp>>({});
  
  // Delete Confirmation State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const { t } = useI18n();

  const handleCreate = () => {
    setEditingApp({
        status: AppStatus.ACTIVE,
        aiModelConfig: 'gemini-3-flash-preview',
        totalUsers: 0,
        monthlyRevenue: 0,
        createdAt: new Date().toISOString()
    });
    setIsModalOpen(true);
  };

  const handleEdit = () => {
    if (!selectedApp) return;
    setEditingApp({ ...selectedApp });
    setIsModalOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedApp) return;
    setApps(prev => prev.filter(app => app.id !== selectedApp.id));
    setSelectedApp(null);
    setIsDeleteModalOpen(false);
  };

  const handleDelete = () => {
    if (!selectedApp) return;
    setIsDeleteModalOpen(true);
  };

  const handleSave = () => {
    // Basic validation
    if (!editingApp.name) {
        alert("Please enter an app name."); // Simple alert for now
        return;
    }

    if (editingApp.id) {
        // Update existing
        const updatedApps = apps.map(app => app.id === editingApp.id ? { ...app, ...editingApp } as SaaSApp : app);
        setApps(updatedApps);
        // Update selected view if it's the same app
        if (selectedApp?.id === editingApp.id) {
            setSelectedApp(editingApp as SaaSApp);
        }
    } else {
        // Create new
        const newApp: SaaSApp = {
            ...editingApp as SaaSApp,
            id: `app_id_${Date.now().toString().slice(-6)}`,
            apiKey: `pk_live_${Math.random().toString(36).substr(2, 16)}`,
            apiSecret: `sk_live_${Math.random().toString(36).substr(2, 24)}`,
            totalUsers: 0,
            monthlyRevenue: 0,
            createdAt: new Date().toISOString()
        };
        setApps([newApp, ...apps]);
    }
    setIsModalOpen(false);
  };

  const StatusBadge = ({ status }: { status: AppStatus }) => {
    const styles = {
      [AppStatus.ACTIVE]: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
      [AppStatus.DEVELOPMENT]: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
      [AppStatus.SUSPENDED]: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800',
    };
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
          <button 
            onClick={handleCreate}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} /> {t('common.newApp')}
          </button>
        </div>
        <div className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-2">
          {apps.map(app => (
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
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedApp.name}</h2>
                    <StatusBadge status={selectedApp.status} />
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">{selectedApp.description}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleEdit}
                        className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm transition-colors"
                        title={t('common.edit')}
                    >
                        <Edit2 size={18} />
                    </button>
                    <button 
                        onClick={handleDelete}
                        className="p-2 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm transition-colors"
                        title={t('common.delete')}
                    >
                        <Trash2 size={18} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <MoreVertical size={20} />
                    </button>
                </div>
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
                      <code className="text-sm bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-indigo-600 dark:text-indigo-400 font-mono">
                          {selectedApp.aiModelConfig}
                      </code>
                   </div>
                   
                   <div className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-200">{t('apps.difyBinding')}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{t('apps.difyBindingDesc')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-md min-w-[120px]">
                            {selectedApp.difyAppId || '-'}
                         </span>
                         {selectedApp.difyAppId && (
                            <span className="text-emerald-500 flex items-center gap-1 text-xs">
                                <Check size={14} /> {t('apps.verify')}
                            </span>
                         )}
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

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {editingApp.id ? t('apps.form.editTitle') : t('apps.form.createTitle')}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {t('apps.form.appName')} <span className="text-rose-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            value={editingApp.name || ''}
                            onChange={e => setEditingApp({ ...editingApp, name: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. Awesome SaaS"
                        />
                    </div>
                    
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('apps.form.description')}</label>
                        <textarea 
                            rows={3}
                            value={editingApp.description || ''}
                            onChange={e => setEditingApp({ ...editingApp, description: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            placeholder="Brief description of the application..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                {t('apps.form.status')} <span className="text-rose-500">*</span>
                            </label>
                            <select 
                                value={editingApp.status}
                                onChange={e => setEditingApp({ ...editingApp, status: e.target.value as AppStatus })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value={AppStatus.ACTIVE}>{t('apps.status.active')}</option>
                                <option value={AppStatus.DEVELOPMENT}>{t('apps.status.development')}</option>
                                <option value={AppStatus.SUSPENDED}>{t('apps.status.suspended')}</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                {t('apps.form.selectModel')} <span className="text-rose-500">*</span>
                            </label>
                            <select 
                                value={editingApp.aiModelConfig}
                                onChange={e => setEditingApp({ ...editingApp, aiModelConfig: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                                <option value="gemini-3-pro-preview">Gemini 3 Pro</option>
                                <option value="gemini-3-pro-image-preview">Gemini 3 Image Pro</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('apps.difyBinding')}</label>
                        <input 
                            type="text" 
                            value={editingApp.difyAppId || ''}
                            onChange={e => setEditingApp({ ...editingApp, difyAppId: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Optional Dify App ID"
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end gap-3">
                    <button 
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                        {t('common.cancel')}
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none"
                    >
                        {t('common.save')}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title={t('common.confirmDelete')}
        message={t('apps.actions.deleteConfirm')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
      />
    </div>
  );
};
