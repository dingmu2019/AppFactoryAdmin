
'use client';

import React, { useState } from 'react';
import { Plus, Search, RefreshCw, Grid, X } from 'lucide-react';
import { useApps } from './hooks/useApps';
import { AppFormModal } from './components/AppFormModal';
import { AppDetail } from './components/AppDetail';
import { AppCard } from './components/AppCard';
import { ConfirmModal } from '@/components/ConfirmModal';
import { type SaaSApp } from '@/types';

const AppsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [settingsApp, setSettingsApp] = useState<SaaSApp | null>(null);

  const { 
    t, 
    apps, 
    setSelectedApp, 
    isModalOpen, 
    setIsModalOpen, 
    editingApp, 
    setEditingApp,
    deleteConfirm,
    setDeleteConfirm,
    confirmDelete,
    rotateConfirm,
    setRotateConfirm,
    confirmRotate,
    isInitialLoading,
    isSaving,
    isRotating,
    llmModels,
    handleCreate,
    handleEdit,
    handleDelete,
    handleSave,
    handleRotateSecret,
    fetchApps
  } = useApps();

  const filteredApps = apps.filter(app => 
    app.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    app.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewSettings = (app: SaaSApp) => {
    setSelectedApp(app); // For hook state
    setSettingsApp(app); // For modal visibility
  };

  const handleCloseSettings = () => {
    setSettingsApp(null);
    setSelectedApp(null);
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header & Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
                type="text" 
                placeholder={t('apps.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={() => fetchApps()}
                className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-500 hover:text-indigo-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                title={t('common.refresh')}
            >
                <RefreshCw size={20} className={isInitialLoading ? 'animate-spin' : ''} />
            </button>
            <button 
                onClick={handleCreate}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-all shadow-lg shadow-indigo-500/30 active:scale-95"
            >
                <Plus size={20} />
                {t('apps.create')}
            </button>
        </div>
      </div>

      {/* Grid Layout */}
      {isInitialLoading && apps.length === 0 ? (
          <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
      ) : filteredApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-zinc-900 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700">
              <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                  <Grid size={32} className="text-zinc-400" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">{t('apps.noApps')}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-center max-w-sm">
                  {t('apps.noAppsDesc')}
              </p>
              <button 
                onClick={handleCreate}
                className="px-6 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
              >
                  {t('apps.createNow')}
              </button>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {filteredApps.map(app => (
                  <AppCard 
                    key={app.id} 
                    app={app} 
                    onEdit={(appToEdit) => {
                        handleEdit(appToEdit);
                    }}
                    onDelete={handleDelete}
                    onViewSettings={handleViewSettings}
                  />
              ))}
          </div>
      )}

      {/* Settings Modal (AppDetail) */}
      {settingsApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-4xl border border-zinc-200 dark:border-zinc-800 overflow-hidden h-[85vh] flex flex-col relative">
            <button 
              onClick={handleCloseSettings}
              className="absolute top-6 right-6 z-20 p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors bg-white/50 dark:bg-black/20 backdrop-blur-md"
            >
              <X size={20} />
            </button>
            <div className="flex-1 overflow-hidden">
                <AppDetail 
                    app={settingsApp} 
                    showSecret={false} // Managed internally by AppDetail or we can pass state if needed
                    setShowSecret={() => {}} 
                    onEdit={() => {
                        handleCloseSettings();
                        handleEdit();
                    }} 
                    onDelete={(id) => {
                        handleCloseSettings();
                        handleDelete(id);
                    }}
                    onRotateSecret={handleRotateSecret}
                    isRotating={isRotating}
                />
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <AppFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        editingApp={editingApp}
        setEditingApp={setEditingApp}
        isSaving={isSaving}
        llmModels={llmModels}
      />

      {/* Delete Confirmation */}
      <ConfirmModal 
        isOpen={deleteConfirm.isOpen}
        title={t('apps.actions.confirmDelete')}
        message={t('apps.actions.deleteConfirm')}
        onConfirm={confirmDelete}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        confirmText={t('common.delete')}
      />

      {/* Rotate Confirmation */}
      <ConfirmModal 
        isOpen={rotateConfirm.isOpen}
        title={t('apps.actions.rotateConfirm')}
        message={t('apps.actions.rotateConfirm')}
        onConfirm={confirmRotate}
        onClose={() => setRotateConfirm({ isOpen: false })}
        confirmText={t('common.confirm')}
      />
    </div>
  );
};

export default AppsPage;
