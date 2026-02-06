import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { requireAdmin } from '../../middleware/auth.ts';
import { AiGatewayAlertService } from '../../services/aiGatewayAlertService.ts';

dotenv.config();

const router = express.Router();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

router.use(requireAdmin);

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const ensureAlertRule = async (appId: string) => {
  const { data: existing, error: e1 } = await supabase.from('ai_gateway_alert_rules').select('*').eq('app_id', appId).maybeSingle();
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
};

/**
 * @openapi
 * /api/admin/ai-gateway/models:
 *   get:
 *     tags: [Admin - AI Gateway]
 *     summary: List available AI models
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of models
 */
router.get('/models', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('integration_configs')
      .select('id, config')
      .eq('category', 'llm')
      .eq('is_enabled', true);

    if (error) return res.status(500).json({ error: error.message });

    const models = (data || [])
      .map((row: any) => ({
        id: row.id,
        provider: row.config?.provider || 'openai',
        model: row.config?.model,
        baseUrl: row.config?.baseUrl || row.config?.endpoint || row.config?.url
      }))
      .filter((m: any) => Boolean(m.model));

    res.json({ data: models });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/admin/ai-gateway/alerts/rule:
 *   get:
 *     tags: [Admin - AI Gateway]
 *     summary: Get alert rule for app
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alert rule
 */
router.get('/alerts/rule', async (req, res) => {
  try {
    const appId = typeof req.query.appId === 'string' ? req.query.appId : '';
    if (!appId) return res.status(400).json({ error: 'appId is required' });
    const rule = await ensureAlertRule(appId);
    res.json({ data: rule });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/admin/ai-gateway/alerts/rule/{appId}:
 *   put:
 *     tags: [Admin - AI Gateway]
 *     summary: Update alert rule
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated rule
 */
router.put('/alerts/rule/:appId', async (req, res) => {
  try {
    const appId = req.params.appId;
    if (!appId) return res.status(400).json({ error: 'appId is required' });

    const body = req.body || {};
    const recipients = Array.isArray(body.recipients)
      ? body.recipients.map((s: any) => String(s || '').trim()).filter(Boolean)
      : typeof body.recipients_text === 'string'
          ? body.recipients_text.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [];

    const payload: any = {
      app_id: appId,
      is_enabled: Boolean(body.is_enabled),
      token_usage_threshold: clamp01(Number(body.token_usage_threshold ?? 0.8)),
      request_usage_threshold: clamp01(Number(body.request_usage_threshold ?? 0.8)),
      error_rate_threshold: clamp01(Number(body.error_rate_threshold ?? 0.05)),
      p95_latency_threshold_ms: Math.max(0, Number(body.p95_latency_threshold_ms ?? 2000)),
      window_minutes: Math.max(1, Number(body.window_minutes ?? 60)),
      cooldown_minutes: Math.max(0, Number(body.cooldown_minutes ?? 60)),
      recipients,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('ai_gateway_alert_rules')
      .upsert(payload, { onConflict: 'app_id' })
      .select('*')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/admin/ai-gateway/alerts/preview:
 *   get:
 *     tags: [Admin - AI Gateway]
 *     summary: Preview alert metrics
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Metrics preview
 */
router.get('/alerts/preview', async (req, res) => {
  try {
    const appId = typeof req.query.appId === 'string' ? req.query.appId : '';
    if (!appId) return res.status(400).json({ error: 'appId is required' });

    const rule = await ensureAlertRule(appId);

    const { data: policy, error: policyError } = await supabase
      .from('ai_gateway_policies')
      .select('daily_token_limit, daily_request_limit')
      .eq('app_id', appId)
      .maybeSingle();
    if (policyError) return res.status(500).json({ error: policyError.message });

    const { data: usageData, error: usageError } = await supabase.rpc('ai_gateway_usage_today', { p_app_id: appId });
    if (usageError) return res.status(500).json({ error: usageError.message });
    const uRow = Array.isArray(usageData) ? usageData[0] : usageData;
    const usage = {
      total_tokens: Number(uRow?.total_tokens || 0),
      request_count: Number(uRow?.request_count || 0),
      daily_token_limit: policy?.daily_token_limit ?? null,
      daily_request_limit: policy?.daily_request_limit ?? null
    };

    const { data: wData, error: wErr } = await supabase.rpc('ai_gateway_window_metrics', {
      p_app_id: appId,
      p_minutes: Number(rule.window_minutes || 60)
    });
    if (wErr) return res.status(500).json({ error: wErr.message });
    const wRow = Array.isArray(wData) ? wData[0] : wData;
    const windowMetrics = {
      request_count: Number(wRow?.request_count || 0),
      error_count: Number(wRow?.error_count || 0),
      error_rate: Number(wRow?.error_rate || 0),
      p95_latency_ms: Number(wRow?.p95_latency_ms || 0),
      total_tokens: Number(wRow?.total_tokens || 0)
    };

    const tokenRatio =
      usage.daily_token_limit && usage.daily_token_limit > 0 ? usage.total_tokens / usage.daily_token_limit : null;
    const requestRatio =
      usage.daily_request_limit && usage.daily_request_limit > 0 ? usage.request_count / usage.daily_request_limit : null;

    const breaches = {
      token: tokenRatio != null ? tokenRatio >= Number(rule.token_usage_threshold || 0.8) : false,
      request: requestRatio != null ? requestRatio >= Number(rule.request_usage_threshold || 0.8) : false,
      error_rate: windowMetrics.request_count > 0 ? windowMetrics.error_rate >= Number(rule.error_rate_threshold || 0.05) : false,
      p95_latency: windowMetrics.request_count > 0 ? windowMetrics.p95_latency_ms >= Number(rule.p95_latency_threshold_ms || 2000) : false
    };

    res.json({ data: { rule, usage, window: windowMetrics, ratios: { tokenRatio, requestRatio }, breaches } });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/admin/ai-gateway/alerts/run:
 *   post:
 *     tags: [Admin - AI Gateway]
 *     summary: Run alert check manually
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: appId
 *         schema:
 *           type: string
 *       - in: query
 *         name: dryRun
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Check result
 */
router.post('/alerts/run', async (req, res) => {
  try {
    const appId = typeof req.query.appId === 'string' ? req.query.appId : undefined;
    const dryRun = req.query.dryRun === 'true' || req.query.dryRun === '1' || Boolean(req.body?.dryRun);
    const result = await AiGatewayAlertService.runOnce({ appId, dryRun });
    res.json({ ok: true, ...result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/admin/ai-gateway/usage/today:
 *   get:
 *     tags: [Admin - AI Gateway]
 *     summary: Get today's usage
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usage data
 */
router.get('/usage/today', async (req, res) => {
  try {
    const appId = typeof req.query.appId === 'string' ? req.query.appId : '';
    if (!appId) return res.status(400).json({ error: 'appId is required' });

    const { data: policy, error: policyError } = await supabase
      .from('ai_gateway_policies')
      .select('daily_token_limit, daily_request_limit')
      .eq('app_id', appId)
      .maybeSingle();

    if (policyError) return res.status(500).json({ error: policyError.message });

    const { data: usageData, error: usageError } = await supabase.rpc('ai_gateway_usage_today', { p_app_id: appId });
    if (usageError) return res.status(500).json({ error: usageError.message });

    const row = Array.isArray(usageData) ? usageData[0] : usageData;
    res.json({
      data: {
        total_tokens: Number(row?.total_tokens || 0),
        request_count: Number(row?.request_count || 0),
        daily_token_limit: policy?.daily_token_limit ?? null,
        daily_request_limit: policy?.daily_request_limit ?? null
      }
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/admin/ai-gateway/usage/trends:
 *   get:
 *     tags: [Admin - AI Gateway]
 *     summary: Get usage trends
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: days
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Trend data
 */
router.get('/usage/trends', async (req, res) => {
  try {
    const appId = typeof req.query.appId === 'string' ? req.query.appId : '';
    const daysRaw = typeof req.query.days === 'string' ? Number(req.query.days) : 7;
    const days = Number.isFinite(daysRaw) ? Math.max(1, Math.min(30, Math.floor(daysRaw))) : 7;
    if (!appId) return res.status(400).json({ error: 'appId is required' });

    const { data, error } = await supabase.rpc('ai_gateway_trends', { p_app_id: appId, p_days: days });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [], days });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/admin/ai-gateway/requests:
 *   get:
 *     tags: [Admin - AI Gateway]
 *     summary: List requests
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Request logs
 */
router.get('/requests', async (req, res) => {
  try {
    const appId = typeof req.query.appId === 'string' ? req.query.appId : '';
    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 50;
    const requestId = typeof req.query.requestId === 'string' ? req.query.requestId.trim() : '';
    const endpoint = typeof req.query.endpoint === 'string' ? req.query.endpoint.trim() : '';
    const day = typeof req.query.day === 'string' ? req.query.day.trim() : '';
    if (!appId) return res.status(400).json({ error: 'appId is required' });

    const safeLimit = Number.isFinite(limit) ? Math.min(200, Math.max(1, limit)) : 50;
    let q = supabase
      .from('ai_gateway_requests')
      .select('id, request_id, endpoint, provider, model, status_code, latency_ms, prompt_tokens, completion_tokens, total_tokens, error_message, created_at')
      .eq('app_id', appId);

    if (requestId) q = q.eq('request_id', requestId);
    if (endpoint) q = q.eq('endpoint', endpoint);

    if (day) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return res.status(400).json({ error: 'day must be YYYY-MM-DD' });
      const start = new Date(`${day}T00:00:00.000Z`);
      if (Number.isNaN(start.getTime())) return res.status(400).json({ error: 'invalid day' });
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      q = q.gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
    }

    const { data, error } = await q.order('created_at', { ascending: false }).limit(safeLimit);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/admin/ai-gateway/policies:
 *   get:
 *     tags: [Admin - AI Gateway]
 *     summary: List policies
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: appId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of policies
 */
router.get('/policies', async (req, res) => {
  try {
    const appId = typeof req.query.appId === 'string' ? req.query.appId : undefined;

    let q = supabase
      .from('ai_gateway_policies')
      .select('id, app_id, default_model, allowed_models, allow_tools, allow_content_logging, max_input_tokens, max_output_tokens, daily_token_limit, daily_request_limit, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (appId) q = q.eq('app_id', appId);

    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/admin/ai-gateway/policies/{appId}:
 *   put:
 *     tags: [Admin - AI Gateway]
 *     summary: Update policy
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated policy
 */
router.put('/policies/:appId', async (req, res) => {
  try {
    const appId = req.params.appId;
    const {
      default_model,
      allowed_models,
      allow_tools,
      allow_content_logging,
      max_input_tokens,
      max_output_tokens,
      daily_token_limit,
      daily_request_limit
    } = req.body || {};

    const payload: any = {
      app_id: appId,
      default_model: typeof default_model === 'string' ? default_model : null,
      allowed_models: Array.isArray(allowed_models) ? allowed_models : null,
      allow_tools: typeof allow_tools === 'boolean' ? allow_tools : false,
      allow_content_logging: typeof allow_content_logging === 'boolean' ? allow_content_logging : false,
      max_input_tokens: typeof max_input_tokens === 'number' ? max_input_tokens : null,
      max_output_tokens: typeof max_output_tokens === 'number' ? max_output_tokens : null,
      daily_token_limit: typeof daily_token_limit === 'number' ? daily_token_limit : null,
      daily_request_limit: typeof daily_request_limit === 'number' ? daily_request_limit : null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('ai_gateway_policies')
      .upsert(payload, { onConflict: 'app_id' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/admin/ai-gateway/credits/balance:
 *   get:
 *     tags: [Admin - AI Gateway]
 *     summary: Get credit balance
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Credit balance
 */
router.get('/credits/balance', async (req, res) => {
  try {
    const appId = typeof req.query.appId === 'string' ? req.query.appId : '';
    if (!appId) return res.status(400).json({ error: 'appId is required' });

    const { data, error } = await supabase
      .from('ai_credit_accounts')
      .select('app_id, balance_credits, reserved_credits, updated_at')
      .eq('app_id', appId)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });

    const balance = Number(data?.balance_credits || 0);
    const reserved = Number(data?.reserved_credits || 0);
    res.json({
      data: {
        app_id: appId,
        balance_credits: balance,
        reserved_credits: reserved,
        available_credits: Math.max(0, balance - reserved),
        updated_at: data?.updated_at || null
      }
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/admin/ai-gateway/credits/ledger:
 *   get:
 *     tags: [Admin - AI Gateway]
 *     summary: Get credit ledger
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Ledger entries
 */
router.get('/credits/ledger', async (req, res) => {
  try {
    const appId = typeof req.query.appId === 'string' ? req.query.appId : '';
    const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : 50;
    if (!appId) return res.status(400).json({ error: 'appId is required' });
    const limit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, Math.floor(limitRaw))) : 50;

    const { data, error } = await supabase
      .from('ai_credit_ledger')
      .select('id, app_id, user_id, kind, delta_balance, delta_reserved, ref_type, ref_id, request_id, details, created_at')
      .eq('app_id', appId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [], limit });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/admin/ai-gateway/credits/usage/daily:
 *   get:
 *     tags: [Admin - AI Gateway]
 *     summary: Get daily credit usage
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: days
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Daily usage
 */
router.get('/credits/usage/daily', async (req, res) => {
  try {
    const appId = typeof req.query.appId === 'string' ? req.query.appId : '';
    const daysRaw = typeof req.query.days === 'string' ? Number(req.query.days) : 14;
    const days = Number.isFinite(daysRaw) ? Math.max(1, Math.min(90, Math.floor(daysRaw))) : 14;
    if (!appId) return res.status(400).json({ error: 'appId is required' });

    const end = new Date();
    const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    const startDay = start.toISOString().slice(0, 10);
    const endDay = end.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('ai_gateway_usage_daily')
      .select('day, request_count, total_tokens, credits_charged, cost_usd')
      .eq('app_id', appId)
      .gte('day', startDay)
      .lte('day', endDay)
      .order('day', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [], days });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/admin/ai-gateway/credits/summary:
 *   get:
 *     tags: [Admin - AI Gateway]
 *     summary: Get credit summary
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Credit summary
 */
router.get('/credits/summary', async (req, res) => {
  try {
    const appId = typeof req.query.appId === 'string' ? req.query.appId : '';
    const from = typeof req.query.from === 'string' ? req.query.from : '';
    const to = typeof req.query.to === 'string' ? req.query.to : '';
    if (!appId) return res.status(400).json({ error: 'appId is required' });
    if (!from || !to) return res.status(400).json({ error: 'from/to is required (YYYY-MM-DD)' });

    const { data: usageRows, error: usageErr } = await supabase
      .from('ai_gateway_usage_daily')
      .select('request_count,total_tokens,credits_charged,cost_usd')
      .eq('app_id', appId)
      .gte('day', from)
      .lte('day', to);
    if (usageErr) return res.status(500).json({ error: usageErr.message });

    const usage = (usageRows || []).reduce(
      (acc: any, r: any) => {
        acc.request_count += Number(r.request_count || 0);
        acc.total_tokens += Number(r.total_tokens || 0);
        acc.credits_charged += Number(r.credits_charged || 0);
        acc.cost_usd += Number(r.cost_usd || 0);
        return acc;
      },
      { request_count: 0, total_tokens: 0, credits_charged: 0, cost_usd: 0 }
    );

    const { data: ledgerRows, error: ledErr } = await supabase
      .from('ai_credit_ledger')
      .select('kind,delta_balance')
      .eq('app_id', appId)
      .gte('created_at', `${from}T00:00:00.000Z`)
      .lte('created_at', `${to}T23:59:59.999Z`);
    if (ledErr) return res.status(500).json({ error: ledErr.message });

    const ledger = (ledgerRows || []).reduce(
      (acc: any, r: any) => {
        const kind = String(r.kind || '');
        const delta = Number(r.delta_balance || 0);
        if (kind === 'TOPUP') acc.topup_credits += delta;
        if (kind === 'CONSUME') acc.consume_credits += Math.abs(delta);
        return acc;
      },
      { topup_credits: 0, consume_credits: 0 }
    );

    res.json({ data: { app_id: appId, from, to, usage, ledger } });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
