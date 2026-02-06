import React, { useState, useEffect } from 'react';
import { Save, Building2 } from 'lucide-react';
import type { EnterpriseConfig } from '../../../../types/integration';
import { useI18n } from '../../../../contexts';

interface Props {
  initialData: Partial<EnterpriseConfig>;
  initialEnabled: boolean;
  onSave: (data: EnterpriseConfig, enabled: boolean) => void;
  onTest: (data: EnterpriseConfig) => void;
  isSaving: boolean;
}

export const EnterpriseConfigForm: React.FC<Props> = ({ initialData, initialEnabled, onSave, isSaving }) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState<Partial<EnterpriseConfig>>({
    name: '',
    address: '',
    description: '',
    departments: '',
    ...initialData
  });
  const [isEnabled, setIsEnabled] = useState(initialEnabled);

  useEffect(() => {
    setFormData(prev => ({ ...prev, ...initialData }));
    setIsEnabled(initialEnabled);
  }, [initialData, initialEnabled]);

  const handleChange = (field: keyof EnterpriseConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
            <Building2 className="text-indigo-600" size={24} />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('integration.enterprise.title')}</h2>
        </div>
        <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {isEnabled ? t('common.enabled') : t('common.disabled')}
            </span>
            <button
                onClick={() => setIsEnabled(!isEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                    isEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
            >
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                    isEnabled ? 'translate-x-6' : 'translate-x-0'
                }`} />
            </button>
        </div>
      </div>

      <div className="space-y-6 bg-white dark:bg-slate-900 rounded-xl">
        <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.enterprise.name')}</label>
            <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
        </div>

        <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.enterprise.address')}</label>
            <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
        </div>

        <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.enterprise.description')}</label>
            <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
            />
        </div>

        <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.enterprise.departments')}</label>
            <textarea
                value={formData.departments}
                onChange={(e) => handleChange('departments', e.target.value)}
                rows={4}
                placeholder={t('integration.enterprise.placeholder.departments')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
            />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-8 border-t border-slate-100 dark:border-slate-800 mt-8">
            <button
                onClick={() => onSave(formData as EnterpriseConfig, isEnabled)}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <Save size={18} />
                )}
                {t('common.save')}
            </button>
        </div>
      </div>
    </div>
  );
};
