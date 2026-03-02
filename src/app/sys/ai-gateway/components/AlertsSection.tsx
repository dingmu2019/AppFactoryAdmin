
import React from 'react';
import type { AlertRule, AlertPreview } from '../types';
import { formatPct } from '../utils';

interface AlertsSectionProps {
  alertRule: AlertRule;
  setAlertRule: React.Dispatch<React.SetStateAction<AlertRule>>;
  alertRecipientsText: string;
  setAlertRecipientsText: (v: string) => void;
  alertPreview: AlertPreview | null;
  setAlertPreview: (p: AlertPreview | null) => void;
  isLoadingAlertRule: boolean;
  isSavingAlertRule: boolean;
  isRunningAlert: boolean;
  previewAlerts: () => void;
  runAlerts: (dryRun: boolean) => void;
  saveAlertRule: () => void;
  selectedAppId: string;
  t: any;
}

export const AlertsSection: React.FC<AlertsSectionProps> = ({
  alertRule,
  setAlertRule,
  alertRecipientsText,
  setAlertRecipientsText,
  alertPreview,
  setAlertPreview,
  isLoadingAlertRule,
  isSavingAlertRule,
  isRunningAlert,
  previewAlerts,
  runAlerts,
  saveAlertRule,
  selectedAppId,
  t,
}) => {
  return (
    <div className="mt-6 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{t('aiGateway.alertsTitle')}</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={previewAlerts}
            disabled={!selectedAppId || isLoadingAlertRule || isRunningAlert}
            className="px-3 py-1.5 rounded-lg text-sm font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:border-indigo-400 disabled:opacity-50"
          >
            {t('aiGateway.alertsPreview')}
          </button>
          <button
            type="button"
            onClick={() => runAlerts(true)}
            disabled={!selectedAppId || isLoadingAlertRule || isRunningAlert}
            className="px-3 py-1.5 rounded-lg text-sm font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 disabled:opacity-50"
          >
            {t('aiGateway.alertsRunDry')}
          </button>
          <button
            type="button"
            onClick={saveAlertRule}
            disabled={!selectedAppId || isLoadingAlertRule || isSavingAlertRule}
            className="px-3 py-1.5 rounded-lg text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {t('aiGateway.alertsSave')}
          </button>
        </div>
      </div>

      {isLoadingAlertRule ? (
        <div className="mt-4 text-sm text-zinc-500">{t('common.loading')}</div>
      ) : (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 p-4 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{t('aiGateway.alertsConfig')}</div>
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={alertRule.is_enabled}
                  onChange={(e) => setAlertRule(prev => ({ ...prev, is_enabled: e.target.checked }))}
                  className="h-4 w-4"
                />
                {t('aiGateway.alertsEnabled')}
              </label>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t('aiGateway.alertsRecipients')}</div>
                <input
                  value={alertRecipientsText}
                  onChange={(e) => setAlertRecipientsText(e.target.value)}
                  placeholder={t('aiGateway.alertsRecipientsPlaceholder')}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="mt-1 text-xs text-zinc-500">{t('aiGateway.alertsRecipientsHint')}</div>
              </div>

              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t('aiGateway.alertsWindow')}</div>
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    value={alertRule.window_minutes}
                    onChange={(e) => setAlertRule(prev => ({ ...prev, window_minutes: Number(e.target.value || 60) }))}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="number"
                    value={alertRule.cooldown_minutes}
                    onChange={(e) => setAlertRule(prev => ({ ...prev, cooldown_minutes: Number(e.target.value || 60) }))}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="mt-1 text-xs text-zinc-500">{t('aiGateway.alertsWindowHint')}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t('aiGateway.alertsTokenThreshold')}</div>
                <input
                  type="number"
                  step="0.01"
                  value={alertRule.token_usage_threshold}
                  onChange={(e) => setAlertRule(prev => ({ ...prev, token_usage_threshold: Number(e.target.value || 0.8) }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t('aiGateway.alertsRequestThreshold')}</div>
                <input
                  type="number"
                  step="0.01"
                  value={alertRule.request_usage_threshold}
                  onChange={(e) => setAlertRule(prev => ({ ...prev, request_usage_threshold: Number(e.target.value || 0.8) }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t('aiGateway.alertsErrorRateThreshold')}</div>
                <input
                  type="number"
                  step="0.01"
                  value={alertRule.error_rate_threshold}
                  onChange={(e) => setAlertRule(prev => ({ ...prev, error_rate_threshold: Number(e.target.value || 0.05) }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t('aiGateway.alertsP95Threshold')}</div>
                <input
                  type="number"
                  value={alertRule.p95_latency_threshold_ms}
                  onChange={(e) => setAlertRule(prev => ({ ...prev, p95_latency_threshold_ms: Number(e.target.value || 2000) }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{t('aiGateway.alertsResult')}</div>
            {alertPreview ? (
              <div className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="text-zinc-600 dark:text-zinc-300">{t('aiGateway.alertsToken')}</div>
                  <div className={`text-xs font-bold px-2 py-1 rounded-full ${alertPreview.breaches.token ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                    {alertPreview.ratios.tokenRatio == null ? '-' : formatPct(alertPreview.ratios.tokenRatio)}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-zinc-600 dark:text-zinc-300">{t('aiGateway.alertsRequest')}</div>
                  <div className={`text-xs font-bold px-2 py-1 rounded-full ${alertPreview.breaches.request ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                    {alertPreview.ratios.requestRatio == null ? '-' : formatPct(alertPreview.ratios.requestRatio)}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-zinc-600 dark:text-zinc-300">{t('aiGateway.alertsErrorRate')}</div>
                  <div className={`text-xs font-bold px-2 py-1 rounded-full ${alertPreview.breaches.error_rate ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                    {formatPct(alertPreview.window.error_rate)}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-zinc-600 dark:text-zinc-300">{t('aiGateway.alertsP95')}</div>
                  <div className={`text-xs font-bold px-2 py-1 rounded-full ${alertPreview.breaches.p95_latency ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                    {`${Math.round(alertPreview.window.p95_latency_ms)}ms`}
                  </div>
                </div>
                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
                  {t('aiGateway.alertsResultHint')}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAlertPreview(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200"
                  >
                    {t('aiGateway.alertsClearPreview')}
                  </button>
                  <button
                    type="button"
                    onClick={() => runAlerts(false)}
                    disabled={isRunningAlert}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {t('aiGateway.alertsRunSend')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-zinc-500">{t('aiGateway.alertsNoPreview')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
