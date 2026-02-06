import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Save, Play, Database, AlertCircle } from 'lucide-react';
import type { DatabaseConfig } from '../../../../types/integration';
import { useI18n } from '../../../../contexts';

interface Props {
  initialData: Partial<DatabaseConfig>;
  initialEnabled: boolean;
  onSave: (data: DatabaseConfig, enabled: boolean) => void;
  onTest: (data: DatabaseConfig) => void;
  isSaving: boolean;
}

const DB_TYPES = [
  { value: 'postgres', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'supabase', label: 'Supabase (PostgreSQL)' },
];

export const DatabaseConfigForm: React.FC<Props> = ({ initialData, initialEnabled, onSave, onTest, isSaving }) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState<Partial<DatabaseConfig>>({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    database: '',
    user: '',
    password: '',
    ssl: false,
    ...initialData
  });
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    setFormData(prev => ({ ...prev, ...initialData }));
    setIsEnabled(initialEnabled);
  }, [initialData, initialEnabled]);

  const handleChange = (field: keyof DatabaseConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isSupabase = formData.type === 'supabase';

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
            <Database className="text-indigo-600" size={24} />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('integration.database.title')}</h2>
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
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.database.type')}</label>
            <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            >
                {DB_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                ))}
            </select>
        </div>

        {isSupabase && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg p-4 flex gap-3">
                <AlertCircle className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" size={20} />
                <div className="text-sm text-indigo-900 dark:text-indigo-200">
                    <p className="font-bold mb-1">{t('integration.database.supabaseHint.title')}</p>
                    <p>{t('integration.database.supabaseHint.body')}</p>
                </div>
            </div>
        )}

        <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.database.host')}</label>
                <input
                    type="text"
                    value={formData.host}
                    onChange={(e) => handleChange('host', e.target.value)}
                    placeholder="db.example.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
            </div>
            <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.database.port')}</label>
                <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => handleChange('port', parseInt(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
            </div>
        </div>

        <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.database.database')}</label>
            <input
                type="text"
                value={formData.database}
                onChange={(e) => handleChange('database', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
        </div>

        <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.database.user')}</label>
                <input
                    type="text"
                    value={formData.user}
                    onChange={(e) => handleChange('user', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
            </div>
            <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.database.password')}</label>
                <div className="relative">
                    <input
                        type={showPass ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all pr-12"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-8 border-t border-slate-100 dark:border-slate-800 mt-8">
            <button
                onClick={() => onTest(formData as DatabaseConfig)}
                className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
                <Play size={18} />
                {t('integration.database.testConnection')}
            </button>
            <button
                onClick={() => onSave(formData as DatabaseConfig, isEnabled)}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
