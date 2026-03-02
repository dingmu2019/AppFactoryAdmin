
import React from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import type { UsageToday } from '../types';
import { formatNumber, progressPct } from '../utils';

interface UsageSectionProps {
  usage: UsageToday;
  isLoadingUsage: boolean;
  fetchUsage: () => void;
  selectedAppId: string;
  t: any;
}

export const UsageSection: React.FC<UsageSectionProps> = ({
  usage,
  isLoadingUsage,
  fetchUsage,
  selectedAppId,
  t,
}) => {
  const tokensPct = progressPct(usage.total_tokens, usage.daily_token_limit);
  const reqPct = progressPct(usage.request_count, usage.daily_request_limit);
  const nearLimit = (usage.daily_token_limit && tokensPct >= 80) || (usage.daily_request_limit && reqPct >= 80);

  return (
    <div className={`p-4 rounded-lg border ${nearLimit ? 'border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20' : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-zinc-800 dark:text-zinc-100">
          <Activity size={16} />
          {t('aiGateway.usageToday')}
        </div>
        <button
          onClick={fetchUsage}
          className="p-2 rounded-lg text-zinc-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-zinc-800 transition-colors"
          title={t('common.refresh')}
          disabled={!selectedAppId || isLoadingUsage}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {isLoadingUsage ? (
        <div className="mt-3 text-sm text-zinc-500">{t('common.loading')}</div>
      ) : (
        <div className="mt-3 space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>{t('aiGateway.tokensUsed')}</span>
              <span>
                {formatNumber(usage.total_tokens)} / {usage.daily_token_limit ? formatNumber(usage.daily_token_limit) : t('aiGateway.unlimited')}
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div
                className={`h-full ${tokensPct >= 90 ? 'bg-rose-500' : tokensPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${tokensPct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>{t('aiGateway.requestsUsed')}</span>
              <span>
                {formatNumber(usage.request_count)} / {usage.daily_request_limit ? formatNumber(usage.daily_request_limit) : t('aiGateway.unlimited')}
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div
                className={`h-full ${reqPct >= 90 ? 'bg-rose-500' : reqPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${reqPct}%` }}
              />
            </div>
          </div>

          {nearLimit && (
            <div className="text-xs text-amber-700 dark:text-amber-300">
              {t('aiGateway.nearQuota')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
