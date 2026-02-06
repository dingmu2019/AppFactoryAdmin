import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Save, Play, Globe } from 'lucide-react';
import { LLMConfig } from '../../../../../types/integration';

interface Props {
  initialData: Partial<LLMConfig>;
  initialEnabled: boolean;
  onSave: (data: LLMConfig, enabled: boolean) => void;
  onTest: (data: LLMConfig) => void;
  isSaving: boolean;
}

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'azure', label: 'Azure OpenAI' },
  { value: 'google', label: 'Google Gemini' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'anthropic', label: 'Anthropic Claude' },
];

export const LLMConfigForm: React.FC<Props> = ({ initialData, initialEnabled, onSave, onTest, isSaving }) => {
  const [formData, setFormData] = useState<Partial<LLMConfig>>({
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1',
    model: 'gpt-4',
    maxTokens: 2048,
    temperature: 0.7,
    apiKey: '',
    ...initialData
  });
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    setFormData(prev => ({ ...prev, ...initialData }));
    setIsEnabled(initialEnabled);
  }, [initialData, initialEnabled]);

  const handleChange = (field: keyof LLMConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isAzure = formData.provider === 'azure';

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
            <Globe className="text-indigo-600" size={24} />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">大模型配置 (LLM)</h2>
        </div>
        <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {isEnabled ? '已启用' : '已禁用'}
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
        {/* Provider */}
        <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">AI 提供商</label>
            <select
                value={formData.provider}
                onChange={(e) => handleChange('provider', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            >
                {PROVIDERS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                ))}
            </select>
        </div>

        {/* Endpoint */}
        <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                接口地址 (Base URL)
            </label>
            <input
                type="text"
                value={formData.endpoint}
                onChange={(e) => handleChange('endpoint', e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
            {isAzure && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    提示: Azure URL 通常包含 &#123;resource&#125; 和 &#123;deployment&#125; 占位符
                </p>
            )}
        </div>

        {/* Model */}
        <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">模型名称</label>
            <input
                type="text"
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                placeholder="gpt-4, gpt-3.5-turbo, etc."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
        </div>

        {/* API Key */}
        <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">API Key</label>
            <div className="relative">
                <input
                    type={showKey ? "text" : "password"}
                    value={formData.apiKey}
                    onChange={(e) => handleChange('apiKey', e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all pr-12"
                />
                <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                    {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
        </div>

        {/* Parameters */}
        <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Max Tokens</label>
                <input
                    type="number"
                    value={formData.maxTokens}
                    onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
            </div>
            <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Temperature</label>
                <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={formData.temperature}
                    onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
            </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-8 border-t border-slate-100 dark:border-slate-800 mt-8">
            <button
                onClick={() => onTest(formData as LLMConfig)}
                className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
                <Play size={18} />
                测试连接
            </button>
            <button
                onClick={() => onSave(formData as LLMConfig, isEnabled)}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <Save size={18} />
                )}
                保存配置
            </button>
        </div>
      </div>
    </div>
  );
};
