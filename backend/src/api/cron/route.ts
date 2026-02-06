import { Router } from 'express';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { executeSkill } from '../../services/skillService.ts';
import { NotificationService } from '../../services/notification/notificationService.ts';
import { OrderService } from '../../services/OrderService.ts';
import { WebhookService } from '../../services/WebhookService.ts';
import { AiGatewayAlertService } from '../../services/aiGatewayAlertService.ts';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function getCronSecretFromRequest(req: any) {
  const headerSecret = req.get('x-cron-secret') || req.get('x-vercel-cron-secret');
  if (headerSecret) return headerSecret;

  const auth = req.get('authorization');
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice('bearer '.length).trim();
  }

  const querySecret = typeof req.query?.secret === 'string' ? req.query.secret : null;
  return querySecret || null;
}

function requireCronAuth(req: any, res: any, next: any) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return res.status(500).json({ error: 'CRON_SECRET not configured' });
  const provided = getCronSecretFromRequest(req);
  if (!provided || provided !== expected) return res.status(401).json({ error: 'Unauthorized' });
  return next();
}

function parseIntEnv(name: string, fallback: number) {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function computeBackoffSeconds(attempt: number) {
  const base = Math.min(60 * 60, Math.pow(2, Math.max(0, attempt - 1)) * 60);
  const jitter = Math.floor(Math.random() * 5);
  return base + jitter;
}

async function fetchDueWebhookEvents(input: { batchSize: number; maxAttempts: number }) {
  const nowIso = new Date().toISOString();
  const queryWithWebhookId = () =>
    supabase
      .from('webhook_events')
      .select('id,webhook_id,event_type,payload,status,attempt_count,next_attempt_at')
      .in('status', ['pending', 'failed'])
      .or(`next_attempt_at.is.null,next_attempt_at.lte.${nowIso}`)
      .lt('attempt_count', input.maxAttempts)
      .order('created_at', { ascending: true })
      .limit(input.batchSize);

  const first = await queryWithWebhookId();
  if (!first.error) return { rows: (first.data || []) as any[], hasWebhookId: true };

  const message = (first.error as any)?.message || '';
  if (typeof message === 'string' && message.includes('webhook_id')) {
    const fallback = await supabase
      .from('webhook_events')
      .select('id,event_type,payload,status,attempt_count,next_attempt_at')
      .in('status', ['pending', 'failed'])
      .or(`next_attempt_at.is.null,next_attempt_at.lte.${nowIso}`)
      .lt('attempt_count', input.maxAttempts)
      .order('created_at', { ascending: true })
      .limit(input.batchSize);
    if (fallback.error) throw fallback.error;
    return { rows: (fallback.data || []) as any[], hasWebhookId: false };
  }

  throw first.error;
}

async function loadWebhookConfig(webhookId: string) {
  const { data, error } = await supabase.from('webhooks').select('id,url,secret,is_active').eq('id', webhookId).maybeSingle();
  if (error) throw error;
  return data as any;
}

const router = Router();

/**
 * @openapi
 * /api/cron/health:
 *   get:
 *     tags: [Cron]
 *     summary: Health check
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/health', requireCronAuth, async (_req, res) => {
  return res.json({ ok: true, now: new Date().toISOString() });
});

/**
 * @openapi
 * /api/cron/daily-report:
 *   get:
 *     tags: [Cron]
 *     summary: Trigger daily report
 *     responses:
 *       200:
 *         description: Report triggered
 */
router.get('/daily-report', requireCronAuth, async (_req, res) => {
  const email = process.env.DAILY_REPORT_EMAIL || '517709151@qq.com';
  if (process.env.VERCEL && process.env.ENABLE_VERCEL_SKILLS !== 'true') {
    return res.json({ ok: true, skipped: true, reason: 'Skill runtime disabled on Vercel', email });
  }
  await executeSkill('daily_report_skill', { email });
  return res.json({ ok: true, email });
});

/**
 * @openapi
 * /api/cron/notifications:
 *   get:
 *     tags: [Cron]
 *     summary: Process notifications
 *     responses:
 *       200:
 *         description: Notifications processed
 */
router.get('/notifications', requireCronAuth, async (_req, res) => {
  const batchSize = parseIntEnv('CRON_NOTIFICATIONS_BATCH_SIZE', 20);
  const result = await NotificationService.processBatch(batchSize);
  return res.json({ ok: true, ...result });
});

/**
 * @openapi
 * /api/cron/orders/auto-cancel:
 *   get:
 *     tags: [Cron]
 *     summary: Auto cancel unpaid orders
 *     responses:
 *       200:
 *         description: Orders cancelled
 */
router.get('/orders/auto-cancel', requireCronAuth, async (_req, res) => {
  const timeoutMinutes = parseIntEnv('ORDER_UNPAID_TIMEOUT_MINUTES', 30);
  const batchSize = parseIntEnv('CRON_ORDERS_BATCH_SIZE', 50);
  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('orders')
    .select('id')
    .eq('status', 'pending')
    .eq('pay_status', 'unpaid')
    .lt('created_at', cutoff)
    .limit(batchSize);

  if (error) throw error;

  const ids = (data || []).map((r: any) => r.id).filter(Boolean);
  let cancelled = 0;
  for (const id of ids) {
    await OrderService.cancelOrder(id, 'auto-timeout-cron');
    cancelled += 1;
  }

  return res.json({ ok: true, scanned: ids.length, cancelled, cutoff });
});

/**
 * @openapi
 * /api/cron/webhooks:
 *   get:
 *     tags: [Cron]
 *     summary: Process webhooks
 *     responses:
 *       200:
 *         description: Webhooks processed
 */
router.get('/webhooks', requireCronAuth, async (_req, res) => {
  const batchSize = parseIntEnv('CRON_WEBHOOKS_BATCH_SIZE', 50);
  const maxAttempts = parseIntEnv('WEBHOOK_MAX_ATTEMPTS', 5);

  const fetched = await fetchDueWebhookEvents({ batchSize, maxAttempts });
  const events = fetched.rows;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const evt of events) {
    if (!fetched.hasWebhookId || !evt.webhook_id) {
      skipped += 1;
      await supabase
        .from('webhook_events')
        .update({
          status: 'failed',
          response_status: 0,
          response_body: 'Missing webhook_id. Apply migration 58_add_webhook_event_webhook_id.sql',
          last_attempt_at: new Date().toISOString(),
          attempt_count: (evt.attempt_count || 0) + 1,
          next_attempt_at: new Date(Date.now() + computeBackoffSeconds((evt.attempt_count || 0) + 1) * 1000).toISOString()
        })
        .eq('id', evt.id);
      continue;
    }

    const hook = await loadWebhookConfig(evt.webhook_id);
    if (!hook || hook.is_active !== true || !hook.url || !hook.secret) {
      skipped += 1;
      await supabase
        .from('webhook_events')
        .update({
          status: 'failed',
          response_status: 0,
          response_body: 'Webhook not found or inactive',
          last_attempt_at: new Date().toISOString(),
          attempt_count: (evt.attempt_count || 0) + 1,
          next_attempt_at: new Date(Date.now() + computeBackoffSeconds((evt.attempt_count || 0) + 1) * 1000).toISOString()
        })
        .eq('id', evt.id);
      continue;
    }

    const nextAttempt = (evt.attempt_count || 0) + 1;
    await supabase
      .from('webhook_events')
      .update({ status: 'sending', last_attempt_at: new Date().toISOString(), attempt_count: nextAttempt })
      .eq('id', evt.id);

    try {
      await WebhookService.processJob({
        attempt_count: nextAttempt,
        data: {
          eventId: evt.id,
          url: hook.url,
          secret: hook.secret,
          payload: evt.payload,
          eventType: evt.event_type
        }
      });
      sent += 1;
    } catch (e) {
      failed += 1;
      const retrySeconds = computeBackoffSeconds(nextAttempt);
      await supabase
        .from('webhook_events')
        .update({
          status: 'failed',
          next_attempt_at: new Date(Date.now() + retrySeconds * 1000).toISOString()
        })
        .eq('id', evt.id);
    }
  }

  return res.json({ ok: true, fetched: events.length, sent, failed, skipped });
});

/**
 * @openapi
 * /api/cron/ai-gateway/alerts:
 *   get:
 *     tags: [Cron]
 *     summary: Check AI Gateway alerts
 *     responses:
 *       200:
 *         description: Alerts checked
 */
router.get('/ai-gateway/alerts', requireCronAuth, async (req, res) => {
  const appId = typeof req.query.appId === 'string' ? req.query.appId : undefined;
  const dryRun = req.query.dryRun === 'true' || req.query.dryRun === '1';
  const result = await AiGatewayAlertService.runOnce({ appId, dryRun });
  return res.json({ ok: true, ...result });
});

/**
 * @openapi
 * /api/cron/run:
 *   get:
 *     tags: [Cron]
 *     summary: Run all cron jobs
 *     responses:
 *       200:
 *         description: All jobs executed
 */
router.get('/run', requireCronAuth, async (_req, res) => {
  const notificationsBatchSize = parseIntEnv('CRON_NOTIFICATIONS_BATCH_SIZE', 20);
  const ordersBatchSize = parseIntEnv('CRON_ORDERS_BATCH_SIZE', 50);
  const ordersTimeoutMinutes = parseIntEnv('ORDER_UNPAID_TIMEOUT_MINUTES', 30);
  const webhooksBatchSize = parseIntEnv('CRON_WEBHOOKS_BATCH_SIZE', 50);
  const webhooksMaxAttempts = parseIntEnv('WEBHOOK_MAX_ATTEMPTS', 5);
  const now = Date.now();

  const notifications = await NotificationService.processBatch(notificationsBatchSize);
  const aiGatewayAlerts = await AiGatewayAlertService.runOnce();

  const cutoff = new Date(Date.now() - ordersTimeoutMinutes * 60 * 1000).toISOString();
  const { data: orderRows, error: orderErr } = await supabase
    .from('orders')
    .select('id')
    .eq('status', 'pending')
    .eq('pay_status', 'unpaid')
    .lt('created_at', cutoff)
    .limit(ordersBatchSize);
  if (orderErr) throw orderErr;
  const orderIds = (orderRows || []).map((r: any) => r.id).filter(Boolean);
  let ordersCancelled = 0;
  for (const id of orderIds) {
    await OrderService.cancelOrder(id, 'auto-timeout-cron');
    ordersCancelled += 1;
  }

  const fetched = await fetchDueWebhookEvents({ batchSize: webhooksBatchSize, maxAttempts: webhooksMaxAttempts });
  const events = fetched.rows;

  let webhooksSent = 0;
  let webhooksSkipped = 0;
  let webhooksFailed = 0;

  for (const evt of (events || []) as any[]) {
    if (!fetched.hasWebhookId || !evt.webhook_id) {
      webhooksSkipped += 1;
      await supabase
        .from('webhook_events')
        .update({
          status: 'failed',
          response_status: 0,
          response_body: 'Missing webhook_id. Apply migration 58_add_webhook_event_webhook_id.sql',
          last_attempt_at: new Date().toISOString(),
          attempt_count: (evt.attempt_count || 0) + 1,
          next_attempt_at: new Date(Date.now() + computeBackoffSeconds((evt.attempt_count || 0) + 1) * 1000).toISOString()
        })
        .eq('id', evt.id);
      continue;
    }

    const hook = await loadWebhookConfig(evt.webhook_id);
    if (!hook || hook.is_active !== true || !hook.url || !hook.secret) {
      webhooksSkipped += 1;
      await supabase
        .from('webhook_events')
        .update({
          status: 'failed',
          response_status: 0,
          response_body: 'Webhook not found or inactive',
          last_attempt_at: new Date().toISOString(),
          attempt_count: (evt.attempt_count || 0) + 1,
          next_attempt_at: new Date(Date.now() + computeBackoffSeconds((evt.attempt_count || 0) + 1) * 1000).toISOString()
        })
        .eq('id', evt.id);
      continue;
    }

    const nextAttempt = (evt.attempt_count || 0) + 1;
    await supabase
      .from('webhook_events')
      .update({ status: 'sending', last_attempt_at: new Date().toISOString(), attempt_count: nextAttempt })
      .eq('id', evt.id);

    try {
      await WebhookService.processJob({
        attempt_count: nextAttempt,
        meta: { managedByCron: true, maxAttempts: webhooksMaxAttempts },
        data: {
          eventId: evt.id,
          url: hook.url,
          secret: hook.secret,
          payload: evt.payload,
          eventType: evt.event_type
        }
      });
      webhooksSent += 1;
    } catch (_e) {
      webhooksFailed += 1;
      const retrySeconds = computeBackoffSeconds(nextAttempt);
      await supabase
        .from('webhook_events')
        .update({
          status: 'failed',
          next_attempt_at: new Date(Date.now() + retrySeconds * 1000).toISOString()
        })
        .eq('id', evt.id);
    }
  }

  return res.json({
    ok: true,
    tookMs: Date.now() - now,
    notifications,
    aiGatewayAlerts,
    orders: { scanned: orderIds.length, cancelled: ordersCancelled, cutoff },
    webhooks: { fetched: (events || []).length, sent: webhooksSent, failed: webhooksFailed, skipped: webhooksSkipped }
  });
});

export default router;
