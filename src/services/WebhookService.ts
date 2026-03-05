import { supabase } from '@/lib/supabase';
import axios from 'axios';
import crypto from 'crypto';

export interface WebhookConfig {
  id?: string;
  app_id: string;
  url: string;
  events: string[];
  is_active: boolean;
  secret?: string;
}

export class WebhookService {
  /**
   * Process a job (alias for dispatch or specialized job processing)
   * Assuming this is what processJob was intended for based on usage
   */
  static async processJob(job: any) {
    return webhookService.processJob(job);
  }

  /**
   * Static wrapper for dispatch
   */
  static async dispatch(appId: string, eventType: string, payload: any) {
    return webhookService.dispatch(appId, eventType, payload);
  }

  /**
   * Process a job (instance method)
   */
  async processJob(job: any) {
    // Basic implementation to satisfy the interface.
    // If job has event structure, dispatch it.
    if (job && job.app_id && job.event_type && job.payload) {
        return this.dispatch(job.app_id, job.event_type, job.payload);
    }
    // If it's a raw job object from a queue
    if (job.data && job.name) {
         // ... handle queue job
         console.log('Processing job:', job.name);
    }
  }

  /**
   * Create or update a webhook configuration
   */
  async saveConfig(config: WebhookConfig): Promise<WebhookConfig> {
    const secret = config.secret || crypto.randomBytes(24).toString('hex');
    
    const payload = {
      app_id: config.app_id,
      url: config.url,
      events: config.events,
      is_active: config.is_active,
      secret,
      updated_at: new Date().toISOString()
    };

    let result;
    if (config.id) {
      result = await supabase
        .from('sys_webhooks')
        .update(payload)
        .eq('id', config.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('sys_webhooks')
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) throw result.error;
    return result.data;
  }

  /**
   * Dispatch an event to all subscribed webhooks
   */
  async dispatch(appId: string, eventType: string, payload: any) {
    // 1. Find all active webhooks for this app that subscribe to this event
    const { data: webhooks, error } = await supabase
      .from('sys_webhooks')
      .select('*')
      .eq('app_id', appId)
      .eq('is_active', true)
      .contains('events', [eventType]);

    if (error) {
        console.error('Failed to fetch webhooks for dispatch', error);
        return;
    }
    
    if (!webhooks || webhooks.length === 0) return;

    // 2. Create event logs (pending state)
    const eventLogs = webhooks.map(wh => ({
      webhook_id: wh.id,
      event_type: eventType,
      payload: payload,
      status: 0, // Pending
      attempt_count: 0,
      next_retry_at: new Date().toISOString() // Ready immediately
    }));

    const { error: insertError } = await supabase
      .from('sys_webhook_events')
      .insert(eventLogs);

    if (insertError) {
        console.error('Failed to log webhook events', insertError);
        return;
    }

    // 3. Trigger immediate delivery (async fire-and-forget in this context, 
    // in real prod this would be picked up by a queue worker)
    this.processPendingEvents().catch(err => console.error('Background webhook processing failed', err));
  }

  /**
   * Process pending webhook events (The Worker)
   */
  async processPendingEvents(limit = 10) {
    // 1. Lock/Select pending events
    const { data: events, error } = await supabase
      .from('sys_webhook_events')
      .select('*, sys_webhooks(url, secret)')
      .lte('next_retry_at', new Date().toISOString())
      .neq('status', 200) // Not success
      .lt('attempt_count', 5) // Max 5 retries
      .limit(limit);

    if (error || !events || events.length === 0) return;

    // 2. Process each event
    const results = await Promise.allSettled(events.map(async (event) => {
        const webhook = event.sys_webhooks as any;
        if (!webhook) return { id: event.id, status: 410, error: 'Webhook config deleted' };

        try {
            // Calculate Signature
            const timestamp = Math.floor(Date.now() / 1000);
            const payloadString = JSON.stringify(event.payload);
            const signature = crypto
                .createHmac('sha256', webhook.secret)
                .update(`${timestamp}.${payloadString}`)
                .digest('hex');

            // Send Request
            const response = await axios.post(webhook.url, event.payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-AdminSys-Event': event.event_type,
                    'X-AdminSys-Signature': `t=${timestamp},v1=${signature}`,
                    'User-Agent': 'AdminSys-Webhook/1.0'
                },
                timeout: 5000
            });

            return { id: event.id, status: response.status, body: JSON.stringify(response.data) };
        } catch (err: any) {
            const status = err.response?.status || 500;
            const body = err.response?.data ? JSON.stringify(err.response.data) : err.message;
            return { id: event.id, status, body, error: true };
        }
    }));

    // 3. Update logs in parallel
    const updatePromises = results.map(async (res) => {
        if (res.status === 'fulfilled') {
            const { id, status, body } = res.value;
            const isSuccess = status >= 200 && status < 300;
            const originalEvent = events.find(e => e.id === id);
            if (!originalEvent) return;
            
            const updatePayload: any = {
                status,
                response_body: body,
                attempt_count: originalEvent.attempt_count + 1,
                updated_at: new Date().toISOString()
            };

            if (!isSuccess) {
                // Exponential backoff: 1min, 5min, 15min, 1h, ...
                const backoffMinutes = Math.pow(2, updatePayload.attempt_count) * 1; 
                const nextRetry = new Date();
                nextRetry.setMinutes(nextRetry.getMinutes() + backoffMinutes);
                updatePayload.next_retry_at = nextRetry.toISOString();
            }

            return supabase
                .from('sys_webhook_events')
                .update(updatePayload)
                .eq('id', id);
        }
    });

    await Promise.all(updatePromises.filter(Boolean));
  }
}

export const webhookService = new WebhookService();
