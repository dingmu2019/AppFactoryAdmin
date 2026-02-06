import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Save, Send, X, Phone } from 'lucide-react';
import type { WhatsAppConfig } from '../../../../types/integration';
import { useToast, useI18n } from '../../../../contexts';

interface Props {
  initialData: Partial<WhatsAppConfig>;
  initialEnabled: boolean;
  onSave: (data: WhatsAppConfig, enabled: boolean) => void;
  isSaving: boolean;
}

export const WhatsAppConfigForm: React.FC<Props> = ({ initialData, initialEnabled, onSave, isSaving }) => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [formData, setFormData] = useState<Partial<WhatsAppConfig>>({
    phoneNumberId: '',
    businessAccountId: '',
    accessToken: '',
    ...initialData
  });
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [showToken, setShowToken] = useState(false);

  // Test Message Modal
  const [showTestModal, setShowTestModal] = useState(false);
  const [testUser, setTestUser] = useState(''); // Phone Number
  const [testContent, setTestContent] = useState(t('integration.whatsapp.placeholder.testContent'));
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    setFormData(prev => ({ ...prev, ...initialData }));
    setIsEnabled(initialEnabled);
  }, [initialData, initialEnabled]);

  const handleChange = (field: keyof WhatsAppConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSendTestMessage = () => {
    if (!testUser) return showToast(t('integration.whatsapp.placeholder.recipient'), 'error');
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
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                <Phone size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('integration.whatsapp.title')}</h2>
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
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.whatsapp.phoneNumberId')}</label>
                <input
                    type="text"
                    value={formData.phoneNumberId}
                    onChange={(e) => handleChange('phoneNumberId', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder={t('integration.whatsapp.placeholder.phoneNumberId')}
                />
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.whatsapp.accountId')}</label>
                <input
                    type="text"
                    value={formData.businessAccountId}
                    onChange={(e) => handleChange('businessAccountId', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder={t('integration.whatsapp.placeholder.accountId')}
                />
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.whatsapp.token')}</label>
                <div className="relative">
                    <input
                        type={showToken ? "text" : "password"}
                        value={formData.accessToken}
                        onChange={(e) => handleChange('accessToken', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all pr-12"
                        placeholder={t('integration.whatsapp.placeholder.token')}
                    />
                    <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
                <p className="text-xs text-slate-500">
                    {t('integration.whatsapp.hint.token')}
                </p>
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
                onClick={() => onSave(formData as WhatsAppConfig, isEnabled)}
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
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">{t('integration.whatsapp.title')} - {t('common.test')}</h3>
                    <button onClick={() => setShowTestModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">{t('integration.whatsapp.recipient')}</label>
                        <input 
                            type="text" 
                            value={testUser}
                            onChange={e => setTestUser(e.target.value)}
                            placeholder={t('integration.whatsapp.placeholder.recipient')}
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <p className="text-xs text-slate-400">{t('integration.whatsapp.hint.recipient')}</p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">{t('integration.whatsapp.content')}</label>
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
