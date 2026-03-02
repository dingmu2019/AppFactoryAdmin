
import React from 'react';
import type { GatewayPolicy } from '../types';
import { toNumberOrNull } from '../utils';

interface PolicySectionProps {
  policy: GatewayPolicy;
  setPolicy: React.Dispatch<React.SetStateAction<GatewayPolicy>>;
  allowedModelsText: string;
  setAllowedModelsText: (v: string) => void;
  modelOptions: string[];
  isLoadingModels: boolean;
  toggleAllowedModel: (m: string) => void;
  allowedList: string[];
  t: any;
}

export const PolicySection: React.FC<PolicySectionProps> = ({
  policy,
  setPolicy,
  allowedModelsText,
  setAllowedModelsText,
  modelOptions,
  isLoadingModels,
  toggleAllowedModel,
  allowedList,
  t,
}) => {
  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40">
        <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{t('aiGateway.model')}</div>
        <div className="mt-3 space-y-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t('aiGateway.defaultModel')}</div>
            <input
              value={policy.default_model ?? ''}
              onChange={(e) => setPolicy(prev => ({ ...prev, default_model: e.target.value || null }))}
              placeholder={t('aiGateway.defaultModelPlaceholder')}
              list="ai-gateway-models"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <datalist id="ai-gateway-models">
              {modelOptions.map(m => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <div className="mt-2 flex flex-wrap gap-2">
              {isLoadingModels ? (
                <span className="text-xs text-zinc-500">{t('common.loading')}</span>
              ) : modelOptions.length === 0 ? (
                <span className="text-xs text-zinc-500">{t('aiGateway.noModels')}</span>
              ) : (
                modelOptions.slice(0, 10).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPolicy(prev => ({ ...prev, default_model: m }))}
                    className={`px-2 py-1 rounded-full text-xs font-bold border transition-colors ${
                      policy.default_model === m
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800 hover:border-indigo-400'
                    }`}
                  >
                    {m}
                  </button>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t('aiGateway.allowedModels')}</div>
            <input
              value={allowedModelsText}
              onChange={(e) => setAllowedModelsText(e.target.value)}
              placeholder={t('aiGateway.allowedModelsPlaceholder')}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="mt-1 text-xs text-zinc-500">{t('aiGateway.allowedModelsHint')}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {modelOptions.slice(0, 14).map(m => {
                const active = allowedList.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleAllowedModel(m)}
                    className={`px-2 py-1 rounded-full text-xs font-bold border transition-colors ${
                      active
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800 hover:border-emerald-400'
                    }`}
                    title={t('aiGateway.clickToggle')}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40">
        <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{t('aiGateway.quota')}</div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t('aiGateway.dailyTokenLimit')}</div>
            <input
              type="number"
              value={policy.daily_token_limit ?? ''}
              onChange={(e) => setPolicy(prev => ({ ...prev, daily_token_limit: toNumberOrNull(e.target.value) }))}
              placeholder={t('aiGateway.unlimited')}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t('aiGateway.dailyRequestLimit')}</div>
            <input
              type="number"
              value={policy.daily_request_limit ?? ''}
              onChange={(e) => setPolicy(prev => ({ ...prev, daily_request_limit: toNumberOrNull(e.target.value) }))}
              placeholder={t('aiGateway.unlimited')}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t('aiGateway.maxInputTokens')}</div>
            <input
              type="number"
              value={policy.max_input_tokens ?? ''}
              onChange={(e) => setPolicy(prev => ({ ...prev, max_input_tokens: toNumberOrNull(e.target.value) }))}
              placeholder={t('aiGateway.unlimited')}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t('aiGateway.maxOutputTokens')}</div>
            <input
              type="number"
              value={policy.max_output_tokens ?? ''}
              onChange={(e) => setPolicy(prev => ({ ...prev, max_output_tokens: toNumberOrNull(e.target.value) }))}
              placeholder={t('aiGateway.unlimited')}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 lg:col-span-2">
        <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{t('aiGateway.security')}</div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div>
              <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{t('aiGateway.allowTools')}</div>
              <div className="text-xs text-zinc-500">{t('aiGateway.allowToolsDesc')}</div>
            </div>
            <input
              type="checkbox"
              checked={policy.allow_tools}
              onChange={(e) => setPolicy(prev => ({ ...prev, allow_tools: e.target.checked }))}
              className="h-4 w-4"
            />
          </label>

          <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div>
              <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{t('aiGateway.allowContentLogging')}</div>
              <div className="text-xs text-zinc-500">{t('aiGateway.allowContentLoggingDesc')}</div>
            </div>
            <input
              type="checkbox"
              checked={policy.allow_content_logging}
              onChange={(e) => setPolicy(prev => ({ ...prev, allow_content_logging: e.target.checked }))}
              className="h-4 w-4"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
