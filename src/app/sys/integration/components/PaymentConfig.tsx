import React, { useState, useEffect } from 'react';
import { CreditCard, Eye, EyeOff, Save, Key, Wallet, AlertCircle, FlaskConical, X } from 'lucide-react';
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
    merchantNo: '',
    termNo: '',
    appId: '',
    publicKey: '',
    secretKey: '',
    webhookSecret: '',
  });
  const [isEnabled, setIsEnabled] = useState(false);
  const [currentId, setCurrentId] = useState<string | undefined>(undefined);
  const [showSecrets, setShowSecrets] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);

  // Load config when configs change or activeProvider changes
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
        merchantNo: '',
        termNo: '',
        appId: '',
        publicKey: '',
        secretKey: '',
        webhookSecret: '',
      });
      setIsEnabled(false);
      setCurrentId(undefined);
    }
  }, [configs, activeProvider]);

  const handleChange = (field: keyof PaymentConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleProviderChange = (provider: PaymentConfig['provider']) => {
    setActiveProvider(provider);
    setShowSecrets(false); // Reset secret visibility on tab change
  };

  const renderFields = () => {
    switch (formData.provider) {
      case 'stripe':
        return (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('integration.payment.publicKey')}</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.publicKey || ''}
                  onChange={(e) => handleChange('publicKey', e.target.value)}
                  placeholder={t('integration.payment.placeholder.publicKey')}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm"
                />
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('integration.payment.secretKey')}</label>
              <div className="relative">
                <input
                  type={showSecrets ? "text" : "password"}
                  value={formData.secretKey || ''}
                  onChange={(e) => handleChange('secretKey', e.target.value)}
                  placeholder={t('integration.payment.placeholder.secretKey')}
                  className="w-full pl-10 pr-12 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm"
                />
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <button
                  type="button"
                  onClick={() => setShowSecrets(!showSecrets)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showSecrets ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('integration.payment.webhookSecret')}</label>
              <div className="relative">
                <input
                  type={showSecrets ? "text" : "password"}
                  value={formData.webhookSecret || ''}
                  onChange={(e) => handleChange('webhookSecret', e.target.value)}
                  placeholder={t('integration.payment.placeholder.webhookSecret')}
                  className="w-full pl-10 pr-12 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm"
                />
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              </div>
            </div>
          </>
        );

      case 'lakala':
        return (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('integration.payment.merchantNo')}</label>
              <input
                type="text"
                value={formData.merchantNo || ''}
                onChange={(e) => handleChange('merchantNo', e.target.value)}
                placeholder={t('integration.payment.placeholder.merchantNo')}
                className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('integration.payment.termNo')}</label>
              <input
                type="text"
                value={formData.termNo || ''}
                onChange={(e) => handleChange('termNo', e.target.value)}
                placeholder={t('integration.payment.placeholder.termNo')}
                className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('integration.payment.publicKey')} (Lakala Public Key)</label>
              <div className="relative">
                <textarea
                  value={formData.publicKey || ''}
                  onChange={(e) => handleChange('publicKey', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-xs"
                  placeholder="-----BEGIN PUBLIC KEY-----"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('integration.payment.secretKey')} (Merchant Private Key)</label>
              <div className="relative">
                <textarea
                  value={formData.secretKey || ''}
                  onChange={(e) => handleChange('secretKey', e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-xs"
                  placeholder="-----BEGIN PRIVATE KEY-----"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('integration.payment.webhookUrl')}</label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/api/v1/webhooks/lakala`}
                  className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed font-mono text-xs"
                />
              </div>
              <p className="text-xs text-zinc-400">{t('integration.payment.lakalaWebhookHint')}</p>
            </div>
          </>
        );
      
      case 'wechat_pay':
      case 'alipay':
        return (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('integration.payment.appId')}</label>
              <input
                type="text"
                value={formData.appId || ''}
                onChange={(e) => handleChange('appId', e.target.value)}
                placeholder={t('integration.payment.placeholder.appId')}
                className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('integration.payment.merchantId')}</label>
              <input
                type="text"
                value={formData.merchantId || ''}
                onChange={(e) => handleChange('merchantId', e.target.value)}
                placeholder={t('integration.payment.placeholder.merchantId')}
                className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('integration.payment.secretKey')}</label>
              <div className="relative">
                <textarea
                  value={formData.secretKey || ''}
                  onChange={(e) => handleChange('secretKey', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-xs"
                  placeholder={t('integration.payment.placeholder.secretKey')}
                />
              </div>
            </div>
            
            <div className="pt-4">
              <button
                type="button"
                onClick={() => setShowTestModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors border border-zinc-200 dark:border-zinc-700 font-medium text-sm"
              >
                <FlaskConical size={16} className="text-indigo-500" />
                支付测试 Demo (支付宝/微信)
              </button>
            </div>
          </>
        );
        
      default:
        return <div className="text-zinc-500">{t('integration.payment.selectProvider')}</div>;
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto relative">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <CreditCard className="text-indigo-600" size={24} />
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{t('integration.payment.title')}</h2>
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
        {/* Provider Selection */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { id: 'stripe', label: 'Stripe' },
            { id: 'wechat_pay', label: t('integration.payment.providers.wechat') },
            { id: 'alipay', label: t('integration.payment.providers.alipay') },
            { id: 'lakala', label: t('integration.payment.providers.lakala') }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => handleProviderChange(p.id as any)}
              className={`px-4 py-3 rounded-lg text-sm font-bold border transition-all ${
                activeProvider === p.id
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-indigo-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Sandbox Toggle */}
        <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
          <AlertCircle size={18} />
          <div className="flex-1 font-medium">{t('integration.payment.sandbox')}</div>
          <button
            onClick={() => handleChange('sandbox', !formData.sandbox)}
            className={`w-10 h-5 rounded-full transition-colors relative ${
              formData.sandbox ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-600'
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
        <div className="flex items-center justify-end gap-4 pt-8 border-t border-zinc-100 dark:border-zinc-800 mt-8">
          <button
            onClick={() => onSave(formData as PaymentConfig, isEnabled, currentId)}
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

      {/* Payment Test Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <FlaskConical size={20} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="font-bold text-lg text-zinc-900 dark:text-white">支付模拟测试 (Sandbox)</h3>
              </div>
              <button 
                onClick={() => setShowTestModal(false)}
                className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors text-zinc-500"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body - Iframe */}
            <div className="flex-1 overflow-auto bg-zinc-50 dark:bg-zinc-950 p-0">
              <iframe 
                src="/sys/integration/payment-test" 
                className="w-full h-[70vh] border-0"
                title="Payment Test Demo"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-end">
              <button
                onClick={() => setShowTestModal(false)}
                className="px-6 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium transition-colors"
              >
                关闭测试
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
