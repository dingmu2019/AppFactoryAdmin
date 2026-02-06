import React, { useState, useEffect } from 'react';
import { CreditCard, Eye, EyeOff, Save, Key, Wallet, AlertCircle } from 'lucide-react';
import type { PaymentConfig, IntegrationConfig } from '../../../../types/integration';
import { useI18n } from '../../../../contexts';

interface Props {
  configs: IntegrationConfig[];
  onSave: (data: PaymentConfig, enabled: boolean, id?: string) => void;
  isSaving: boolean;
}

export const PaymentConfigForm: React.FC<Props> = ({ configs, onSave, isSaving }) => {
  const { t } = useI18n();
  const [activeProvider, setActiveProvider] = useState<PaymentConfig['provider']>('stripe');
  
  const [formData, setFormData] = useState<Partial<PaymentConfig>>({
    provider: 'stripe',
    sandbox: true,
    merchantId: '',
    appId: '',
    publicKey: '',
    secretKey: '',
    webhookSecret: '',
  });
  const [isEnabled, setIsEnabled] = useState(false);
  const [currentId, setCurrentId] = useState<string | undefined>(undefined);
  const [showSecrets, setShowSecrets] = useState(false);

  // Load config when provider or source configs change
  useEffect(() => {
    const existing = configs.find(c => (c.config as PaymentConfig).provider === activeProvider);
    if (existing) {
      setFormData({ ...existing.config as PaymentConfig });
      setIsEnabled(existing.is_enabled);
      setCurrentId(existing.id);
    } else {
      // Reset to defaults for new provider
      setFormData({
        provider: activeProvider,
        sandbox: true,
        merchantId: '',
        appId: '',
        publicKey: '',
        secretKey: '',
        webhookSecret: '',
      });
      setIsEnabled(false);
      setCurrentId(undefined);
    }
  }, [activeProvider, configs]);

  const handleChange = (field: keyof PaymentConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleProviderChange = (provider: PaymentConfig['provider']) => {
    setActiveProvider(provider);
  };

  const renderFields = () => {
    switch (formData.provider) {
      case 'stripe':
        return (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.payment.publicKey')}</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.publicKey || ''}
                  onChange={(e) => handleChange('publicKey', e.target.value)}
                  placeholder={t('integration.payment.placeholder.publicKey')}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm"
                />
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.payment.secretKey')}</label>
              <div className="relative">
                <input
                  type={showSecrets ? "text" : "password"}
                  value={formData.secretKey || ''}
                  onChange={(e) => handleChange('secretKey', e.target.value)}
                  placeholder={t('integration.payment.placeholder.secretKey')}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm"
                />
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <button
                  type="button"
                  onClick={() => setShowSecrets(!showSecrets)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showSecrets ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.payment.webhookSecret')}</label>
              <div className="relative">
                <input
                  type={showSecrets ? "text" : "password"}
                  value={formData.webhookSecret || ''}
                  onChange={(e) => handleChange('webhookSecret', e.target.value)}
                  placeholder={t('integration.payment.placeholder.webhookSecret')}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm"
                />
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>
            </div>
          </>
        );
      
      case 'wechat_pay':
      case 'alipay':
        return (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.payment.appId')}</label>
              <input
                type="text"
                value={formData.appId || ''}
                onChange={(e) => handleChange('appId', e.target.value)}
                placeholder={t('integration.payment.placeholder.appId')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.payment.merchantId')}</label>
              <input
                type="text"
                value={formData.merchantId || ''}
                onChange={(e) => handleChange('merchantId', e.target.value)}
                placeholder={t('integration.payment.placeholder.merchantId')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t('integration.payment.secretKey')}</label>
              <div className="relative">
                <textarea
                  value={formData.secretKey || ''}
                  onChange={(e) => handleChange('secretKey', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-xs"
                  placeholder={t('integration.payment.placeholder.secretKey')}
                />
              </div>
            </div>
          </>
        );
        
      default:
        return <div className="text-slate-500">{t('integration.payment.selectProvider')}</div>;
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto relative">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <CreditCard className="text-indigo-600" size={24} />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('integration.payment.title')}</h2>
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
        {/* Provider Selection */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { id: 'stripe', label: 'Stripe' },
            { id: 'wechat_pay', label: t('integration.payment.providers.wechat') },
            { id: 'alipay', label: t('integration.payment.providers.alipay') },
            { id: 'paypal', label: 'PayPal' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => handleProviderChange(p.id as any)}
              className={`px-4 py-3 rounded-xl text-sm font-bold border transition-all ${
                activeProvider === p.id
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Sandbox Toggle */}
        <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
          <AlertCircle size={18} />
          <div className="flex-1 font-medium">{t('integration.payment.sandbox')}</div>
          <button
            onClick={() => handleChange('sandbox', !formData.sandbox)}
            className={`w-10 h-5 rounded-full transition-colors relative ${
              formData.sandbox ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${
              formData.sandbox ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Dynamic Fields */}
        <div className="space-y-6">
          {renderFields()}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-8 border-t border-slate-100 dark:border-slate-800 mt-8">
          <button
            onClick={() => onSave(formData as PaymentConfig, isEnabled, currentId)}
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
