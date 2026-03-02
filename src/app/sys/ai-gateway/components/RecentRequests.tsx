
import React from 'react';
import { ListChecks, RefreshCw, X } from 'lucide-react';
import type { RequestLog } from '../types';
import { formatDateTime, formatNumber, copyToClipboard } from '../utils';

interface RecentRequestsProps {
  requests: RequestLog[];
  isLoadingRequests: boolean;
  fetchRequests: () => void;
  selectedAppId: string;
  requestIdFilter: string;
  setRequestIdFilter: (v: string) => void;
  endpointFilter: string;
  setEndpointFilter: (v: string) => void;
  dayFilter: string;
  setDayFilter: (v: string) => void;
  setSelectedRequest: (r: RequestLog) => void;
  showToast: any;
  t: any;
}

export const RecentRequests: React.FC<RecentRequestsProps> = ({
  requests,
  isLoadingRequests,
  fetchRequests,
  selectedAppId,
  requestIdFilter,
  setRequestIdFilter,
  endpointFilter,
  setEndpointFilter,
  dayFilter,
  setDayFilter,
  setSelectedRequest,
  showToast,
  t,
}) => {
  const hasRequestFilters = Boolean(requestIdFilter || endpointFilter || dayFilter);
  const clearRequestFilters = () => {
    setRequestIdFilter('');
    setEndpointFilter('');
    setDayFilter('');
  };

  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 lg:col-span-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-zinc-800 dark:text-zinc-100">
          <ListChecks size={16} />
          {t('aiGateway.recentRequests')}
        </div>
        <button
          onClick={fetchRequests}
          className="p-2 rounded-lg text-zinc-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-zinc-800 transition-colors"
          title={t('common.refresh')}
          disabled={!selectedAppId || isLoadingRequests}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {hasRequestFilters && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="text-xs text-zinc-500">{t('aiGateway.filters')}</div>
          {dayFilter && (
            <button
              type="button"
              onClick={() => setDayFilter('')}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200"
              title={t('aiGateway.clearOne')}
            >
              {t('aiGateway.filterDay')}: {dayFilter}
              <X size={14} />
            </button>
          )}
          {endpointFilter && (
            <button
              type="button"
              onClick={() => setEndpointFilter('')}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200"
              title={t('aiGateway.clearOne')}
            >
              {t('aiGateway.filterEndpoint')}: {endpointFilter}
              <X size={14} />
            </button>
          )}
          {requestIdFilter && (
            <button
              type="button"
              onClick={() => setRequestIdFilter('')}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200"
              title={t('aiGateway.clearOne')}
            >
              {t('aiGateway.filterRequestId')}: {requestIdFilter}
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={clearRequestFilters}
            className="px-3 py-1 rounded-lg text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
          >
            {t('aiGateway.clearFilters')}
          </button>
          <button
            type="button"
            onClick={async () => {
              const ok = await copyToClipboard(window.location.href);
              if (ok) showToast(t('aiGateway.linkCopied'), 'success');
            }}
            className="px-3 py-1 rounded-lg text-xs font-bold bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200"
          >
            {t('aiGateway.copyLink')}
          </button>
        </div>
      )}

      {isLoadingRequests ? (
        <div className="mt-3 text-sm text-zinc-500">{t('common.loading')}</div>
      ) : requests.length === 0 ? (
        <div className="mt-3 text-sm text-zinc-500">{hasRequestFilters ? t('aiGateway.noFilteredRequests') : t('aiGateway.noRequests')}</div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-500">
                <th className="text-left font-semibold py-2 pr-4">{t('aiGateway.time')}</th>
                <th className="text-left font-semibold py-2 pr-4">{t('aiGateway.modelCol')}</th>
                <th className="text-left font-semibold py-2 pr-4">{t('aiGateway.tokensCol')}</th>
                <th className="text-left font-semibold py-2 pr-4">{t('aiGateway.latencyCol')}</th>
                <th className="text-left font-semibold py-2 pr-4">{t('aiGateway.statusCol')}</th>
              </tr>
            </thead>
            <tbody>
              {requests.slice(0, 8).map(r => {
                const bad = r.status_code >= 400;
                return (
                  <tr
                    key={r.id}
                    className="border-t border-zinc-200/60 dark:border-zinc-800/60 hover:bg-white/60 dark:hover:bg-zinc-900/40 cursor-pointer"
                    onClick={() => setSelectedRequest(r)}
                  >
                    <td className="py-2 pr-4 text-zinc-700 dark:text-zinc-200 whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                    <td className="py-2 pr-4">
                      <div className="text-zinc-800 dark:text-zinc-100">{r.model || '-'}</div>
                      <div className="text-xs text-zinc-500">{r.provider || '-'}</div>
                    </td>
                    <td className="py-2 pr-4 text-zinc-700 dark:text-zinc-200 whitespace-nowrap">{formatNumber(r.total_tokens || 0)}</td>
                    <td className="py-2 pr-4 text-zinc-700 dark:text-zinc-200 whitespace-nowrap">{r.latency_ms != null ? `${r.latency_ms}ms` : '-'}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${bad ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}
                        title={r.error_message || ''}
                      >
                        {r.status_code}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
