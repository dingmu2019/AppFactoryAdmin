import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Save, MessageSquare, Send, X } from 'lucide-react';
import type { WeChatConfig } from '../../../../types/integration';
import { useToast, useI18n } from '../../../../contexts';

interface Props {
  initialData: Partial<WeChatConfig>;
  initialEnabled: boolean;
  onSave: (data: WeChatConfig, enabled: boolean) => void;
  isSaving: boolean;
}

export const WeChatConfigForm: React.FC<Props> = ({ initialData, initialEnabled, onSave, isSaving }) => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [formData, setFormData] = useState<Partial<WeChatConfig>>({
    corpId: '',
    agentId: '',
    secret: '',
    ...initialData
  });
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [showSecret, setShowSecret] = useState(false);

  // Test Message Modal
  const [showTestModal, setShowTestModal] = useState(false);
  const [testUser, setTestUser] = useState('');
  const [testContent, setTestContent] = useState(t('integration.wechat.testContent'));
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    setFormData(prev => ({ ...prev, ...initialData }));
    setIsEnabled(initialEnabled);
  }, [initialData, initialEnabled]);

  const handleChange = (field: keyof WeChatConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSendTestMessage = () => {
    if (!testUser) return showToast(t('integration.wechat.placeholder.recipient'), 'error');
    setIsSending(true);
    setTimeout(() => {
        setIsSending(false);
        setShowTestModal(false);
        showToast(`${t('common.testSuccess')} -> ${testUser}`, 'success');
    }, 1500);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto relative">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
            <MessageSquare className="text-indigo-600" size={24} />
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{t('integration.wechat.title')}</h2>
        </div>
        <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                {isEnabled ? t('common.enabled') : t('common.disabled')}
            </span>
            <button
                onClick={() => setIsEnabled(!isEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                    isEnabled ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
            >
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                    isEnabled ? 'translate-x-6' : 'translate-x-0'
                }`} />
            </button>
        </div>
      </div>

      <div className="space-y-6 bg-white dark:bg-zinc-900 rounded-lg">
        <div className="space-y-2">
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('integration.wechat.corpId')}</label>
            <input
                type="text"
                value={formData.corpId}
                onChange={(e) => handleChange('corpId', e.target.value)}
                placeholder={t('integration.wechat.placeholder.corpId')}
                className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
        </div>

        <div className="space-y-2">
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('integration.wechat.agentId')}</label>
            <input
                type="text"
                value={formData.agentId}
                onChange={(e) => handleChange('agentId', e.target.value)}
                placeholder={t('integration.wechat.placeholder.agentId')}
                className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
        </div>

        <div className="space-y-2">
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('integration.wechat.secret')}</label>
            <div className="relative">
                <input
                    type={showSecret ? "text" : "password"}
                    value={formData.secret}
                    onChange={(e) => handleChange('secret', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all pr-12"
                />
                <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                    {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-8 border-t border-zinc-100 dark:border-zinc-800 mt-8">
            <button
                onClick={() => setShowTestModal(true)}
                className="px-6 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center gap-2"
            >
                <Send size={18} />
                {t('common.test')}
            </button>
            <button
                onClick={() => onSave(formData as WeChatConfig, isEnabled)}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-2xl w-full max-w-md overflow-hidden relative border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-white">{t('common.test')}</h3>
                    <button onClick={() => setShowTestModal(false)} className="text-zinc-400 hover:text-zinc-600"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">{t('integration.wechat.recipient')}</label>
                        <input 
                            type="text" 
                            value={testUser}
                            onChange={e => setTestUser(e.target.value)}
                            placeholder={t('integration.wechat.placeholder.recipient')}
                            className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">{t('integration.wechat.content')}</label>
                        <textarea 
                            value={testContent}
                            onChange={e => setTestContent(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                    </div>
                </div>
                <div className="p-6 pt-0 flex justify-end gap-3">
                    <button onClick={() => setShowTestModal(false)} className="px-4 py-2 rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">{t('common.cancel')}</button>
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
