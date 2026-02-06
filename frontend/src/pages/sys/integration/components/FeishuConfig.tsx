import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Save, Send, X, FileText } from 'lucide-react';
import type { FeishuConfig } from '../../../../types/integration';
import { useToast, useI18n } from '../../../../contexts';

interface Props {
  initialData: Partial<FeishuConfig>;
  initialEnabled: boolean;
  onSave: (data: FeishuConfig, enabled: boolean) => void;
  isSaving: boolean;
}

export const FeishuConfigForm: React.FC<Props> = ({ initialData, initialEnabled, onSave, isSaving }) => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [formData, setFormData] = useState<Partial<FeishuConfig>>({
    appId: '',
    appSecret: '',
    encryptKey: '',
    verificationToken: '',
    ...initialData
  });
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [showSecret, setShowSecret] = useState(false);

  // Test Message Modal
  const [showTestModal, setShowTestModal] = useState(false);
  const [testUser, setTestUser] = useState(''); // OpenID or Email
  const [testContent, setTestContent] = useState(t('integration.feishu.testContent'));
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    setFormData(prev => ({ ...prev, ...initialData }));
    setIsEnabled(initialEnabled);
  }, [initialData, initialEnabled]);

  const handleChange = (field: keyof FeishuConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSendTestMessage = () => {
    if (!testUser) return showToast(t('integration.feishu.placeholder.recipient'), 'error');
    setIsSending(true);
    // TODO: Implement backend API call
    setTimeout(() => {
        setIsSending(false);
        setShowTestModal(false);
        showToast(t('common.testSuccess'), 'success');
    }, 1500);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto relative">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                <FileText size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('integration.feishu.title')}</h2>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.feishu.appId')}</label>
                <input
                    type="text"
                    value={formData.appId}
                    onChange={(e) => handleChange('appId', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder={t('integration.feishu.placeholder.appId')}
                />
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.feishu.appSecret')}</label>
                <div className="relative">
                    <input
                        type={showSecret ? "text" : "password"}
                        value={formData.appSecret}
                        onChange={(e) => handleChange('appSecret', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all pr-12"
                    />
                    <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.feishu.encryptKey')}</label>
                <input
                    type="text"
                    value={formData.encryptKey}
                    onChange={(e) => handleChange('encryptKey', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder={t('integration.feishu.placeholder.encryptKey')}
                />
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.feishu.verificationToken')}</label>
                <input
                    type="text"
                    value={formData.verificationToken}
                    onChange={(e) => handleChange('verificationToken', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder={t('integration.feishu.placeholder.verificationToken')}
                />
            </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-8 border-t border-slate-100 dark:border-slate-800 mt-8">
            <button
                onClick={() => setShowTestModal(true)}
                className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center gap-2"
            >
                <Send size={18} />
                {t('common.test')}
            </button>
            <button
                onClick={() => onSave(formData as FeishuConfig, isEnabled)}
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

      {/* Test Message Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">{t('integration.feishu.title')} - {t('common.test')}</h3>
                    <button onClick={() => setShowTestModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">{t('integration.feishu.recipient')}</label>
                        <input 
                            type="text" 
                            value={testUser}
                            onChange={e => setTestUser(e.target.value)}
                            placeholder={t('integration.feishu.placeholder.recipient')}
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">{t('integration.feishu.content')}</label>
                        <textarea 
                            value={testContent}
                            onChange={e => setTestContent(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                    </div>
                </div>
                <div className="p-6 pt-0 flex justify-end gap-3">
                    <button onClick={() => setShowTestModal(false)} className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">{t('common.cancel')}</button>
                    <button 
                        onClick={handleSendTestMessage}
                        disabled={isSending}
                        className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-70 flex items-center gap-2"
                    >
                        {isSending && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        {t('common.test')}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
