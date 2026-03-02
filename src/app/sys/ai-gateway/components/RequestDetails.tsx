
import React from 'react';
import { X, Copy } from 'lucide-react';
import type { RequestLog } from '../types';
import { formatDateTime, formatNumber, copyToClipboard } from '../utils';

interface RequestDetailsProps {
  selectedRequest: RequestLog;
  setSelectedRequest: (r: RequestLog | null) => void;
  filterByEndpoint: (e: string) => void;
  filterByRequestId: (id: string) => void;
  clearRequestFilters: () => void;
  showToast: any;
  t: any;
}

export const RequestDetails: React.FC<RequestDetailsProps> = ({
  selectedRequest,
  setSelectedRequest,
  filterByEndpoint,
  filterByRequestId,
  clearRequestFilters,
  showToast,
  t,
}) => {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedRequest(null)} />
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white dark:bg-zinc-950 shadow-2xl border-l border-zinc-200 dark:border-zinc-800 overflow-y-auto">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-zinc-900 dark:text-white">{t('aiGateway.requestDetails')}</div>
            <div className="text-xs text-zinc-500">{formatDateTime(selectedRequest.created_at)}</div>
          </div>
          <button
            onClick={() => setSelectedRequest(null)}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            title={t('aiGateway.close')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
              <div className="text-xs text-zinc-500">{t('aiGateway.endpoint')}</div>
              <div className="mt-1 text-sm font-mono text-zinc-800 dark:text-zinc-100 break-all">{selectedRequest.endpoint}</div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    filterByEndpoint(selectedRequest.endpoint || '');
                    setSelectedRequest(null);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:border-indigo-400"
                  title={t('aiGateway.quickFilter')}
                >
                  {t('aiGateway.filterEndpointBtn')}
                </button>
              </div>
            </div>
            <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
              <div className="text-xs text-zinc-500">{t('aiGateway.requestId')}</div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="text-sm font-mono text-zinc-800 dark:text-zinc-100 break-all">{selectedRequest.request_id}</div>
                <button
                  className="p-2 rounded-lg text-zinc-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-zinc-800 transition-colors"
                  onClick={async () => {
                    const ok = await copyToClipboard(selectedRequest.request_id || '');
                    if (ok) showToast(t('aiGateway.copied'), 'success');
                  }}
                  title={t('aiGateway.copy')}
                >
                  <Copy size={16} />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    filterByRequestId(selectedRequest.request_id || '');
                    setSelectedRequest(null);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  title={t('aiGateway.quickFilter')}
                >
                  {t('aiGateway.filterRequestIdBtn')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearRequestFilters();
                    setSelectedRequest(null);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:border-rose-400"
                >
                  {t('aiGateway.clearFilters')}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="text-xs text-zinc-500">{t('aiGateway.provider')}</div>
              <div className="mt-1 text-sm font-bold text-zinc-900 dark:text-white">{selectedRequest.provider || '-'}</div>
            </div>
            <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="text-xs text-zinc-500">{t('aiGateway.modelCol')}</div>
              <div className="mt-1 text-sm font-bold text-zinc-900 dark:text-white">{selectedRequest.model || '-'}</div>
            </div>
            <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="text-xs text-zinc-500">{t('aiGateway.statusCol')}</div>
              <div className="mt-1 text-sm font-bold text-zinc-900 dark:text-white">{selectedRequest.status_code}</div>
            </div>
            <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="text-xs text-zinc-500">{t('aiGateway.latencyCol')}</div>
              <div className="mt-1 text-sm font-bold text-zinc-900 dark:text-white">{selectedRequest.latency_ms != null ? `${selectedRequest.latency_ms}ms` : '-'}</div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
            <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{t('aiGateway.tokensBreakdown')}</div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-zinc-500">{t('aiGateway.promptTokens')}</div>
                <div className="text-base font-bold text-zinc-900 dark:text-white">{formatNumber(selectedRequest.prompt_tokens || 0)}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">{t('aiGateway.completionTokens')}</div>
                <div className="text-base font-bold text-zinc-900 dark:text-white">{formatNumber(selectedRequest.completion_tokens || 0)}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">{t('aiGateway.totalTokens')}</div>
                <div className="text-base font-bold text-zinc-900 dark:text-white">{formatNumber(selectedRequest.total_tokens || 0)}</div>
              </div>
            </div>
          </div>

          {selectedRequest.error_message && (
            <div className="p-4 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20">
              <div className="text-sm font-bold text-rose-800 dark:text-rose-200">{t('aiGateway.errorReason')}</div>
              <div className="mt-2 text-sm text-rose-700 dark:text-rose-200 whitespace-pre-wrap break-words">{selectedRequest.error_message}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
