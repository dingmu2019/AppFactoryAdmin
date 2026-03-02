import React from 'react';
import { FileText, Layers, RefreshCw, X } from 'lucide-react';
import { useI18n } from '../../../contexts';
import { type SaaSApp, AppStatus } from '../../../types';

interface AppFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingApp: Partial<SaaSApp>;
  setEditingApp: (app: Partial<SaaSApp>) => void;
  isSaving?: boolean;
  llmModels: { id: string; name: string; provider: string }[];
}

export const AppFormModal: React.FC<AppFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingApp,
  setEditingApp,
  isSaving = false,
  llmModels = []
}) => {
  const { t } = useI18n();

  const inputStyles = "w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400";
  const labelStyles = "block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5";
  const sectionHeaderStyles = "flex items-center gap-2 mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800/50";
  const sectionTitleStyles = "text-sm font-bold text-zinc-900 dark:text-white";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
            {editingApp.id ? t('apps.form.editTitle') : t('apps.form.createTitle')}
          </h3>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="flex-1 overflow-hidden flex flex-col">
          <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1">
            {/* Section 1: Basic Info */}
            <section>
              <div className={sectionHeaderStyles}>
                <FileText size={16} className="text-indigo-600 dark:text-indigo-400" />
                <h4 className={sectionTitleStyles}>{t('common.basicInfo')}</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className={labelStyles}>{t('apps.form.appName')}</label>
                  <input
                    type="text"
                    required
                    value={editingApp.name || ''}
                    onChange={(e) => setEditingApp({ ...editingApp, name: e.target.value })}
                    className={inputStyles}
                    placeholder={t('apps.placeholders.appName')}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={labelStyles}>{t('apps.form.description')}</label>
                  <textarea
                    value={editingApp.description || ''}
                    onChange={(e) => setEditingApp({ ...editingApp, description: e.target.value })}
                    className={`${inputStyles} min-h-[100px] resize-none`}
                    placeholder={t('apps.placeholders.description')}
                  />
                </div>

                <div>
                  <label className={labelStyles}>{t('apps.form.status')}</label>
                  <select
                    value={editingApp.status}
                    onChange={(e) => setEditingApp({ ...editingApp, status: e.target.value as AppStatus })}
                    className={inputStyles}
                  >
                    <option value={AppStatus.ACTIVE}>{t('apps.status.active')}</option>
                    <option value={AppStatus.DEVELOPMENT}>{t('apps.status.development')}</option>
                    <option value={AppStatus.SUSPENDED}>{t('apps.status.suspended')}</option>
                  </select>
                </div>

                {!editingApp.id && (
                  <div>
                    <label className={labelStyles}>{t('apps.form.customId')}</label>
                    <input
                      type="text"
                      value={editingApp.customId || ''}
                      onChange={(e) => setEditingApp({ ...editingApp, customId: e.target.value })}
                      className={`${inputStyles} font-mono text-sm`}
                      placeholder={t('apps.placeholders.customId')}
                    />
                    <p className="text-[11px] text-zinc-500 mt-1.5 px-1">{t('apps.hints.autoUUID')}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Section 2: Intelligence & Network */}
            <section>
              <div className={sectionHeaderStyles}>
                <Layers size={16} className="text-emerald-600 dark:text-emerald-400" />
                <h4 className={sectionTitleStyles}>{t('apps.intelligence')}</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelStyles}>{t('apps.form.selectModel')}</label>
                  <select
                    value={editingApp.aiModelConfig || ''}
                    onChange={(e) => setEditingApp({ ...editingApp, aiModelConfig: e.target.value })}
                    className={inputStyles}
                  >
                    <option value="" disabled>{t('apps.form.selectModelPlaceholder')}</option>
                    {llmModels.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name} ({model.provider})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelStyles}>{t('apps.form.ipWhitelist')}</label>
                  <input
                    type="text"
                    value={editingApp.allowedIps || ''}
                    onChange={(e) => setEditingApp({ ...editingApp, allowedIps: e.target.value })}
                    className={inputStyles}
                    placeholder={t('apps.placeholders.ipWhitelist')}
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors font-medium"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all font-medium active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving && <RefreshCw size={14} className="animate-spin" />}
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
