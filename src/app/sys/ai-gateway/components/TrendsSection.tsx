
import React, { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts';
import type { TrendPoint } from '../types';
import { formatNumber, formatPct } from '../utils';

interface TrendsSectionProps {
  trends: TrendPoint[];
  isLoadingTrends: boolean;
  fetchTrends: (appId: string, days: 7 | 30) => void;
  selectedAppId: string;
  trendDays: 7 | 30;
  setTrendDays: (d: 7 | 30) => void;
  filterByDay: (day: string) => void;
  t: any;
}

export const TrendsSection: React.FC<TrendsSectionProps> = ({
  trends,
  isLoadingTrends,
  fetchTrends,
  selectedAppId,
  trendDays,
  setTrendDays,
  filterByDay,
  t,
}) => {
  const trendTokens = useMemo(() => trends.map(p => ({ day: p.day, tokens: p.total_tokens })), [trends]);
  const trendQuality = useMemo(
    () => trends.map(p => ({ day: p.day, errorPct: p.error_rate * 100, p95: p.p95_latency_ms })),
    [trends]
  );
  const trendSummary = useMemo(() => {
    const totalTokens = trends.reduce((sum, p) => sum + (p.total_tokens || 0), 0);
    const totalReq = trends.reduce((sum, p) => sum + (p.request_count || 0), 0);
    const totalErr = trends.reduce((sum, p) => sum + Math.round((p.request_count || 0) * (p.error_rate || 0)), 0);
    const errorRate = totalReq > 0 ? totalErr / totalReq : 0;
    const p95Avg = trends.length > 0 ? trends.reduce((sum, p) => sum + (p.p95_latency_ms || 0), 0) / trends.length : 0;
    return { totalTokens, totalReq, errorRate, p95Avg };
  }, [trends]);

  return (
    <div className="mt-6 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{t('aiGateway.trendsTitle')}</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTrendDays(7)}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${
              trendDays === 7
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800 hover:border-indigo-400'
            }`}
          >
            {t('aiGateway.range7')}
          </button>
          <button
            type="button"
            onClick={() => setTrendDays(30)}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${
              trendDays === 30
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800 hover:border-indigo-400'
            }`}
          >
            {t('aiGateway.range30')}
          </button>
          <button
            onClick={() => selectedAppId && fetchTrends(selectedAppId, trendDays)}
            className="p-2 rounded-lg text-zinc-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-zinc-800 transition-colors"
            title={t('common.refresh')}
            disabled={!selectedAppId || isLoadingTrends}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-500">{t('aiGateway.tokensUsed')}</div>
          <div className="text-lg font-bold text-zinc-900 dark:text-white">{formatNumber(trendSummary.totalTokens)}</div>
        </div>
        <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-500">{t('aiGateway.requestsUsed')}</div>
          <div className="text-lg font-bold text-zinc-900 dark:text-white">{formatNumber(trendSummary.totalReq)}</div>
        </div>
        <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-500">{t('aiGateway.failureRate')}</div>
          <div className="text-lg font-bold text-zinc-900 dark:text-white">{formatPct(trendSummary.errorRate)}</div>
        </div>
        <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-500">{t('aiGateway.p95Latency')}</div>
          <div className="text-lg font-bold text-zinc-900 dark:text-white">{`${Math.round(trendSummary.p95Avg)}ms`}</div>
        </div>
      </div>

      {isLoadingTrends ? (
        <div className="mt-4 text-sm text-zinc-500">{t('common.loading')}</div>
      ) : trends.length === 0 ? (
        <div className="mt-4 text-sm text-zinc-500">{t('aiGateway.noTrends')}</div>
      ) : (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-56 p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="text-xs font-bold text-zinc-600 dark:text-zinc-300">{t('aiGateway.tokensTrend')}</div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trendTokens}
                  onClick={(e: any) => {
                    const d = e?.activeLabel;
                    if (typeof d === 'string') filterByDay(d);
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} tickFormatter={(v: any) => String(v).slice(5)} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="tokens" stroke="#6366F1" fill="#6366F1" fillOpacity={0.18} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="h-56 p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="text-xs font-bold text-zinc-600 dark:text-zinc-300">{t('aiGateway.qualityTrend')}</div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trendQuality}
                  onClick={(e: any) => {
                    const d = e?.activeLabel;
                    if (typeof d === 'string') filterByDay(d);
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} tickFormatter={(v: any) => String(v).slice(5)} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line yAxisId="left" type="monotone" dataKey="p95" stroke="#F59E0B" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="errorPct" stroke="#EF4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
