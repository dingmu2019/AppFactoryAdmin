import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { NotificationService } from './notification/notificationService.ts';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

type AlertRuleRow = {
  id: string;
  app_id: string;
  is_enabled: boolean;
  token_usage_threshold: number;
  request_usage_threshold: number;
  error_rate_threshold: number;
  p95_latency_threshold_ms: number;
  window_minutes: number;
  cooldown_minutes: number;
  recipients: string[];
  last_token_alert_at: string | null;
  last_request_alert_at: string | null;
  last_error_alert_at: string | null;
  last_p95_alert_at: string | null;
};

type PolicyRow = {
  daily_token_limit: number | null;
  daily_request_limit: number | null;
};

type UsageToday = {
  total_tokens: number;
  request_count: number;
};

type WindowMetrics = {
  request_count: number;
  error_count: number;
  error_rate: number;
  p95_latency_ms: number;
  total_tokens: number;
};

type BreachType = 'token' | 'request' | 'error_rate' | 'p95_latency';

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

const ms = (n: number) => `${Math.round(n)}ms`;

const safeEmails = (recipients: any) =>
  (Array.isArray(recipients) ? recipients : [])
    .map((s: any) => String(s || '').trim())
    .filter(Boolean);

const shouldNotify = (lastAtIso: string | null, cooldownMinutes: number, nowMs: number) => {
  if (!lastAtIso) return true;
  const lastMs = Date.parse(lastAtIso);
  if (!Number.isFinite(lastMs)) return true;
  return nowMs - lastMs >= Math.max(0, cooldownMinutes) * 60 * 1000;
};

export class AiGatewayAlertService {
  static async ensureDefaultRule(appId: string) {
    const { data: existing, error: e1 } = await supabase
      .from('ai_gateway_alert_rules')
      .select('*')
      .eq('app_id', appId)
      .maybeSingle();
    if (e1) throw e1;
    if (existing) return existing as any;

    const payload = {
      app_id: appId,
      is_enabled: false,
      token_usage_threshold: 0.8,
      request_usage_threshold: 0.8,
      error_rate_threshold: 0.05,
      p95_latency_threshold_ms: 2000,
      window_minutes: 60,
      cooldown_minutes: 60,
      recipients: [] as string[],
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase.from('ai_gateway_alert_rules').insert(payload).select('*').single();
    if (error) throw error;
    return data as any;
  }

  static async runOnce(input?: { appId?: string; dryRun?: boolean }) {
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    let q = supabase
      .from('ai_gateway_alert_rules')
      .select(
        'id,app_id,is_enabled,token_usage_threshold,request_usage_threshold,error_rate_threshold,p95_latency_threshold_ms,window_minutes,cooldown_minutes,recipients,last_token_alert_at,last_request_alert_at,last_error_alert_at,last_p95_alert_at'
      )
      .eq('is_enabled', true);
    if (input?.appId) q = q.eq('app_id', input.appId);

    const { data: rules, error } = await q;
    if (error) throw error;

    let scanned = 0;
    let breaches = 0;
    let notificationsEnqueued = 0;

    for (const r of (rules || []) as any[]) {
      scanned += 1;
      const rule: AlertRuleRow = {
        id: r.id,
        app_id: r.app_id,
        is_enabled: Boolean(r.is_enabled),
        token_usage_threshold: clamp01(Number(r.token_usage_threshold ?? 0.8)),
        request_usage_threshold: clamp01(Number(r.request_usage_threshold ?? 0.8)),
        error_rate_threshold: clamp01(Number(r.error_rate_threshold ?? 0.05)),
        p95_latency_threshold_ms: Number(r.p95_latency_threshold_ms ?? 2000),
        window_minutes: Math.max(1, Number(r.window_minutes ?? 60)),
        cooldown_minutes: Math.max(0, Number(r.cooldown_minutes ?? 60)),
        recipients: safeEmails(r.recipients),
        last_token_alert_at: r.last_token_alert_at ?? null,
        last_request_alert_at: r.last_request_alert_at ?? null,
        last_error_alert_at: r.last_error_alert_at ?? null,
        last_p95_alert_at: r.last_p95_alert_at ?? null
      };

      const { data: appRow, error: appErr } = await supabase.from('saas_apps').select('id,name').eq('id', rule.app_id).maybeSingle();
      if (appErr) throw appErr;
      const appName = appRow?.name || rule.app_id;

      const { data: policy, error: pErr } = await supabase
        .from('ai_gateway_policies')
        .select('daily_token_limit,daily_request_limit')
        .eq('app_id', rule.app_id)
        .maybeSingle();
      if (pErr) throw pErr;
      const limits: PolicyRow = {
        daily_token_limit: policy?.daily_token_limit ?? null,
        daily_request_limit: policy?.daily_request_limit ?? null
      };

      const { data: usageData, error: uErr } = await supabase.rpc('ai_gateway_usage_today', { p_app_id: rule.app_id });
      if (uErr) throw uErr;
      const uRow = Array.isArray(usageData) ? usageData[0] : usageData;
      const usage: UsageToday = {
        total_tokens: Number(uRow?.total_tokens || 0),
        request_count: Number(uRow?.request_count || 0)
      };

      const { data: windowData, error: wErr } = await supabase.rpc('ai_gateway_window_metrics', {
        p_app_id: rule.app_id,
        p_minutes: rule.window_minutes
      });
      if (wErr) throw wErr;
      const wRow = Array.isArray(windowData) ? windowData[0] : windowData;
      const windowMetrics: WindowMetrics = {
        request_count: Number(wRow?.request_count || 0),
        error_count: Number(wRow?.error_count || 0),
        error_rate: Number(wRow?.error_rate || 0),
        p95_latency_ms: Number(wRow?.p95_latency_ms || 0),
        total_tokens: Number(wRow?.total_tokens || 0)
      };

      const candidates: Array<{ type: BreachType; ok: boolean; lastAt: string | null; title: string; detail: string }> = [];

      if (limits.daily_token_limit && limits.daily_token_limit > 0) {
        const ratio = usage.total_tokens / limits.daily_token_limit;
        candidates.push({
          type: 'token',
          ok: ratio >= rule.token_usage_threshold,
          lastAt: rule.last_token_alert_at,
          title: 'Token 配额告警',
          detail: `今日 Token：${usage.total_tokens}/${limits.daily_token_limit}（${pct(ratio)}，阈值 ${pct(rule.token_usage_threshold)}）`
        });
      }

      if (limits.daily_request_limit && limits.daily_request_limit > 0) {
        const ratio = usage.request_count / limits.daily_request_limit;
        candidates.push({
          type: 'request',
          ok: ratio >= rule.request_usage_threshold,
          lastAt: rule.last_request_alert_at,
          title: '请求次数配额告警',
          detail: `今日请求：${usage.request_count}/${limits.daily_request_limit}（${pct(ratio)}，阈值 ${pct(rule.request_usage_threshold)}）`
        });
      }

      candidates.push({
        type: 'error_rate',
        ok: windowMetrics.error_rate >= rule.error_rate_threshold && windowMetrics.request_count > 0,
        lastAt: rule.last_error_alert_at,
        title: '失败率告警',
        detail: `近${rule.window_minutes}分钟失败率：${pct(windowMetrics.error_rate)}（失败 ${windowMetrics.error_count}/${windowMetrics.request_count}，阈值 ${pct(rule.error_rate_threshold)}）`
      });

      candidates.push({
        type: 'p95_latency',
        ok: windowMetrics.p95_latency_ms >= rule.p95_latency_threshold_ms && windowMetrics.request_count > 0,
        lastAt: rule.last_p95_alert_at,
        title: '延迟告警',
        detail: `近${rule.window_minutes}分钟 P95：${ms(windowMetrics.p95_latency_ms)}（阈值 ${ms(rule.p95_latency_threshold_ms)}）`
      });

      const breached = candidates.filter(c => c.ok);
      if (!breached.length) continue;

      for (const b of breached) {
        breaches += 1;
        if (!shouldNotify(b.lastAt, rule.cooldown_minutes, nowMs)) continue;
        if (!rule.recipients.length) continue;

        const dashboard = process.env.DASHBOARD_URL || '';
        const link = dashboard ? `${dashboard}/sys/ai-gateway?appId=${encodeURIComponent(rule.app_id)}` : '';
        const content =
          `[${b.title}] ${appName}\n` +
          `时间：${nowIso}\n` +
          `${b.detail}\n` +
          (link ? `排障入口：${link}\n` : '') +
          `近${rule.window_minutes}分钟：请求 ${windowMetrics.request_count}，失败率 ${pct(windowMetrics.error_rate)}，P95 ${ms(windowMetrics.p95_latency_ms)}\n`;

        if (!input?.dryRun) {
          for (const recipient of rule.recipients) {
            await NotificationService.enqueue('email', 'ai_gateway_alert', recipient, {
              variables: {
                content,
                appId: rule.app_id,
                appName,
                type: b.type,
                now: nowIso
              },
              language: 'zh-CN'
            });
            notificationsEnqueued += 1;
          }

          const updatePayload: any = { updated_at: nowIso };
          if (b.type === 'token') updatePayload.last_token_alert_at = nowIso;
          if (b.type === 'request') updatePayload.last_request_alert_at = nowIso;
          if (b.type === 'error_rate') updatePayload.last_error_alert_at = nowIso;
          if (b.type === 'p95_latency') updatePayload.last_p95_alert_at = nowIso;
          await supabase.from('ai_gateway_alert_rules').update(updatePayload).eq('id', rule.id);
        }
      }
    }

    return { scanned, breaches, notificationsEnqueued, dryRun: Boolean(input?.dryRun) };
  }
}

