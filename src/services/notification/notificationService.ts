import { supabaseAdmin as supabase } from '../../lib/supabase';
import { renderTemplate } from './templating';
import { SmtpProvider } from './providers/smtpProvider';
import { WebhookProvider } from './providers/webhookProvider';
import type {
  ChannelType,
  NotificationChannelRow,
  NotificationMessageRow,
  NotificationProviderRow,
  NotificationRouteRow,
  NotificationTemplateRow,
  ProviderSendInput
} from './types';

function computeNextRetry(attempts: number) {
  const base = Math.min(60, Math.pow(2, Math.max(0, attempts - 1)) * 2);
  const jitter = Math.floor(Math.random() * 1000);
  return new Date(Date.now() + base * 1000 + jitter).toISOString();
}

async function loadChannel(channelType: ChannelType) {
  const { data, error } = await supabase
    .from('notification_channels')
    .select('id,channel_type,name,is_enabled')
    .eq('channel_type', channelType)
    .maybeSingle();
  if (error) throw error;
  return data as NotificationChannelRow | null;
}

async function loadRoute(channelId: string, messageType: string) {
  const { data, error } = await supabase
    .from('notification_routes')
    .select('id,channel_id,message_type,provider_id,fallback_provider_id,priority,is_enabled')
    .eq('channel_id', channelId)
    .eq('message_type', messageType)
    .eq('is_enabled', true)
    .order('priority', { ascending: true })
    .limit(1);
  if (error) throw error;
  return (data?.[0] || null) as NotificationRouteRow | null;
}

async function loadProvider(providerId: string) {
  const { data, error } = await supabase
    .from('notification_providers')
    .select('id,channel_id,provider_type,name,config,is_enabled')
    .eq('id', providerId)
    .maybeSingle();
  if (error) throw error;
  return data as NotificationProviderRow | null;
}

async function loadTemplate(channelId: string, messageType: string, language: string) {
  const { data, error } = await supabase
    .from('notification_templates')
    .select('id,channel_id,message_type,language,subject,body,format,is_enabled')
    .eq('channel_id', channelId)
    .eq('message_type', messageType)
    .eq('language', language)
    .eq('is_enabled', true)
    .maybeSingle();
  if (error) throw error;
  return data as NotificationTemplateRow | null;
}

function defaultEmailTemplate(messageType: string) {
  if (messageType === 'login_verification') {
    return {
      subject: '[AdminSys] 登录验证码 {{code}}',
      body:
        '<div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px;">' +
        '<h2 style="color:#111827;">登录验证码</h2>' +
        '<p style="color:#374151;">验证码：<b style="font-size:22px;letter-spacing:6px;">{{code}}</b></p>' +
        '<p style="color:#9CA3AF;font-size:12px;">有效期 {{ttlMinutes}} 分钟</p>' +
        '</div>',
      format: 'html' as const
    };
  }
  return {
    subject: '[AdminSys] 通知',
    body: '{{content}}',
    format: 'text' as const
  };
}

async function buildSendInput(channelType: ChannelType, message: NotificationMessageRow) {
  const variables = message.payload?.variables || {};
  const language = message.payload?.language || 'zh-CN';
  const template = await loadTemplate(message.channel_id, message.message_type, language);

  if (channelType === 'email') {
    const fallback = defaultEmailTemplate(message.message_type);
    const subject = renderTemplate(template?.subject || fallback.subject, variables);
    const body = renderTemplate(template?.body || fallback.body, variables);
    const format = (template?.format || fallback.format) as ProviderSendInput['format'];
    return { to: message.recipient, subject, body, format, payload: message.payload };
  }

  const body = renderTemplate(template?.body || JSON.stringify({ type: message.message_type, variables }), variables);
  const format = ((template?.format as any) || 'json') as ProviderSendInput['format'];
  return { to: message.recipient, body, format, payload: message.payload };
}

async function sendWithProvider(provider: NotificationProviderRow, input: ProviderSendInput) {
  if (!provider.is_enabled) {
    return { success: false as const, errorMessage: 'Provider disabled', response: null };
  }

  if (provider.provider_type === 'smtp') {
    const p = new SmtpProvider();
    const result = await p.send(input);
    return { ...result, providerType: 'smtp' as const };
  }

  if (provider.provider_type === 'webhook') {
    const url = provider.config?.url;
    if (!url) return { success: false as const, errorMessage: 'Missing webhook url', response: null };
    const p = new WebhookProvider({
      url,
      method: provider.config?.method,
      headers: provider.config?.headers,
      timeoutMs: provider.config?.timeoutMs
    });
    const result = await p.send(input);
    return { ...result, providerType: 'webhook' as const };
  }

  return { success: false as const, errorMessage: `Unsupported provider_type: ${provider.provider_type}`, response: null };
}

export class NotificationService {
  static async getOverview() {
    const { data: channels, error: cErr } = await supabase
      .from('notification_channels')
      .select('id,channel_type,name,is_enabled')
      .order('channel_type', { ascending: true });
    if (cErr) throw cErr;

    const channelIds = (channels || []).map((c: any) => c.id);
    const { data: providers, error: pErr } = await supabase
      .from('notification_providers')
      .select('id,channel_id,provider_type,name,config,is_enabled,created_at,updated_at')
      .in('channel_id', channelIds.length ? channelIds : ['00000000-0000-0000-0000-000000000000']);
    if (pErr) throw pErr;

    const { data: routes, error: rErr } = await supabase
      .from('notification_routes')
      .select('id,channel_id,message_type,provider_id,fallback_provider_id,priority,is_enabled,created_at,updated_at')
      .in('channel_id', channelIds.length ? channelIds : ['00000000-0000-0000-0000-000000000000']);
    if (rErr) throw rErr;

    const { data: templates, error: tErr } = await supabase
      .from('notification_templates')
      .select('id,channel_id,message_type,language,subject,body,format,is_enabled,created_at,updated_at')
      .in('channel_id', channelIds.length ? channelIds : ['00000000-0000-0000-0000-000000000000']);
    if (tErr) throw tErr;

    return { channels: channels || [], providers: providers || [], routes: routes || [], templates: templates || [] };
  }

  static async upsertChannelConfig(input: {
    channelType: ChannelType;
    channelName?: string;
    isEnabled: boolean;
    provider: { providerType: 'smtp' | 'webhook'; name: string; isEnabled: boolean; config?: any };
    route: { messageType: string; priority?: number; isEnabled: boolean };
    template?: { messageType: string; language?: string; subject?: string; body: string; format?: 'text' | 'html' | 'json'; isEnabled: boolean };
  }) {
    const existing = await loadChannel(input.channelType);
    let channelId = existing?.id;
    if (!channelId) {
      const { data, error } = await supabase
        .from('notification_channels')
        .insert({ channel_type: input.channelType, name: input.channelName || input.channelType, is_enabled: input.isEnabled })
        .select('id')
        .single();
      if (error) throw error;
      channelId = data.id;
    } else {
      const { error } = await supabase
        .from('notification_channels')
        .update({ is_enabled: input.isEnabled, name: input.channelName || existing?.name || input.channelType })
        .eq('id', channelId);
      if (error) throw error;
    }

    const { data: providerExisting, error: peErr } = await supabase
      .from('notification_providers')
      .select('id')
      .eq('channel_id', channelId)
      .eq('name', input.provider.name)
      .maybeSingle();
    if (peErr) throw peErr;

    let providerId = providerExisting?.id as string | undefined;
    if (!providerId) {
      const { data, error } = await supabase
        .from('notification_providers')
        .insert({
          channel_id: channelId,
          provider_type: input.provider.providerType,
          name: input.provider.name,
          is_enabled: input.provider.isEnabled,
          config: input.provider.config || {}
        })
        .select('id')
        .single();
      if (error) throw error;
      providerId = data.id;
    } else {
      const { error } = await supabase
        .from('notification_providers')
        .update({
          provider_type: input.provider.providerType,
          is_enabled: input.provider.isEnabled,
          config: input.provider.config || {}
        })
        .eq('id', providerId);
      if (error) throw error;
    }

    const { data: routeExisting, error: reErr } = await supabase
      .from('notification_routes')
      .select('id')
      .eq('channel_id', channelId)
      .eq('message_type', input.route.messageType)
      .eq('priority', input.route.priority ?? 100)
      .maybeSingle();
    if (reErr) throw reErr;

    if (!routeExisting?.id) {
      const { error } = await supabase.from('notification_routes').insert({
        channel_id: channelId,
        message_type: input.route.messageType,
        provider_id: providerId,
        priority: input.route.priority ?? 100,
        is_enabled: input.route.isEnabled
      });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('notification_routes')
        .update({ provider_id: providerId, is_enabled: input.route.isEnabled })
        .eq('id', routeExisting.id);
      if (error) throw error;
    }

    if (input.template) {
      const language = input.template.language || 'zh-CN';
      const { data: tmplExisting, error: teErr } = await supabase
        .from('notification_templates')
        .select('id')
        .eq('channel_id', channelId)
        .eq('message_type', input.template.messageType)
        .eq('language', language)
        .maybeSingle();
      if (teErr) throw teErr;

      const payload = {
        channel_id: channelId,
        message_type: input.template.messageType,
        language,
        subject: input.template.subject,
        body: input.template.body,
        format: input.template.format || 'text',
        is_enabled: input.template.isEnabled
      };

      if (!tmplExisting?.id) {
        const { error } = await supabase.from('notification_templates').insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('notification_templates').update(payload).eq('id', tmplExisting.id);
        if (error) throw error;
      }
    }

    return { channelId, providerId };
  }

  static async enqueue(channelType: ChannelType, messageType: string, recipient: string, payload: any) {
    const channel = await loadChannel(channelType);
    if (!channel) throw new Error(`Channel not found: ${channelType}`);
    if (!channel.is_enabled) throw new Error(`Channel disabled: ${channelType}`);

    const { data, error } = await supabase
      .from('notification_messages')
      .insert({
        channel_id: channel.id,
        message_type: messageType,
        recipient,
        payload,
        status: 'pending',
        attempts: 0,
        max_attempts: payload?.maxAttempts ?? 3,
        next_retry_at: null
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as NotificationMessageRow;
  }

  static async processBatch(batchSize = 20) {
    const { data, error } = await supabase.rpc('claim_notification_jobs', { batch_size: batchSize });
    if (error) throw error;

    const jobs = (data || []) as unknown as NotificationMessageRow[];
    for (const job of jobs) {
      await this.processOne(job).catch(async err => {
        const message = err?.message || 'Processing failed';
        await supabase
          .from('notification_messages')
          .update({ status: 'failed', last_error: message })
          .eq('id', job.id);
      });
    }

    return { processed: jobs.length };
  }

  static async processOne(job: NotificationMessageRow) {
    const channel = await supabase
      .from('notification_channels')
      .select('id,channel_type,is_enabled')
      .eq('id', job.channel_id)
      .maybeSingle();
    if (channel.error) throw channel.error;
    const channelRow = channel.data as any;
    if (!channelRow?.is_enabled) {
      await supabase.from('notification_messages').update({ status: 'failed', last_error: 'Channel disabled' }).eq('id', job.id);
      return { success: false };
    }

    const route = await loadRoute(job.channel_id, job.message_type);
    if (!route) {
      await supabase.from('notification_messages').update({ status: 'failed', last_error: 'Route not found' }).eq('id', job.id);
      return { success: false };
    }

    const provider = await loadProvider(route.provider_id);
    if (!provider) {
      await supabase.from('notification_messages').update({ status: 'failed', last_error: 'Provider not found' }).eq('id', job.id);
      return { success: false };
    }

    const sendInput = await buildSendInput(channelRow.channel_type as ChannelType, job);
    const started = Date.now();
    const result = await sendWithProvider(provider, sendInput);
    const latencyMs = Date.now() - started;

    await supabase.from('notification_logs').insert({
      message_id: job.id,
      provider_id: provider.id,
      status: result.success ? 'sent' : 'failed',
      latency_ms: latencyMs,
      response: result.response,
      error_message: result.success ? null : result.errorMessage
    });

    if (result.success) {
      await supabase.from('notification_messages').update({ status: 'sent', last_error: null }).eq('id', job.id);
      return { success: true };
    }

    const nextAttempts = (job.attempts || 0) + 1;
    if (nextAttempts >= (job.max_attempts || 3)) {
      await supabase
        .from('notification_messages')
        .update({ status: 'failed', attempts: nextAttempts, last_error: result.errorMessage || 'Failed' })
        .eq('id', job.id);
      return { success: false };
    }

    await supabase
      .from('notification_messages')
      .update({
        status: 'pending',
        attempts: nextAttempts,
        last_error: result.errorMessage || 'Failed',
        next_retry_at: computeNextRetry(nextAttempts)
      })
      .eq('id', job.id);
    return { success: false };
  }

  static async sendTest(channelType: ChannelType, recipient: string, messageType: string, variables: Record<string, any>) {
    const payload = { variables, language: 'zh-CN' };
    const msg = await this.enqueue(channelType, messageType, recipient, payload);
    await this.processOne(msg);
    const { data } = await supabase
      .from('notification_logs')
      .select('*')
      .eq('message_id', msg.id)
      .order('created_at', { ascending: false })
      .limit(1);
    return { messageId: msg.id, log: data?.[0] || null };
  }
}
