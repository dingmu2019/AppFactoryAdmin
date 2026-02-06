
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { JobQueue } from './jobQueue.ts';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export class WebhookService {

    static async createWebhook(appId: string, url: string, events: string[], description?: string) {
        const secret = crypto.randomBytes(32).toString('hex');
        const { data, error } = await supabase
            .from('webhooks')
            .insert({
                app_id: appId,
                url,
                events,
                secret,
                description,
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
    
    /**
     * Trigger an event to be sent to all subscribed webhooks
     */
    static async dispatch(appId: string, eventType: string, payload: any) {
        // 1. Find subscriptions for this app and event
        // Note: We use the array contains operator @> for 'events' column
        const { data: hooks, error } = await supabase
            .from('webhooks')
            .select('*')
            .eq('app_id', appId)
            .eq('is_active', true)
            .contains('events', [eventType]);

        if (error || !hooks || hooks.length === 0) {
            // No subscribers
            return;
        }

        // 2. Create Event Log entries and Queue jobs
        for (const hook of hooks) {
            // Insert Log
            let eventLog: any = null;
            let logError: any = null;

            const insertPayload: any = {
                webhook_id: hook.id,
                app_id: appId,
                event_type: eventType,
                payload: payload,
                status: 'pending',
                next_attempt_at: new Date().toISOString()
            };

            ({ data: eventLog, error: logError } = await supabase
                .from('webhook_events')
                .insert(insertPayload)
                .select()
                .single());

            if (logError && typeof logError.message === 'string' && logError.message.includes('webhook_id')) {
                const fallbackPayload = { ...insertPayload };
                delete fallbackPayload.webhook_id;
                ({ data: eventLog, error: logError } = await supabase
                    .from('webhook_events')
                    .insert(fallbackPayload)
                    .select()
                    .single());
            }
            
            if (logError || !eventLog) {
                console.error('Failed to log webhook event:', logError);
                continue;
            }

            if (!process.env.VERCEL) {
                await JobQueue.schedule('webhook-dispatch', {
                    eventId: eventLog.id,
                    url: hook.url,
                    secret: hook.secret,
                    payload: payload,
                    eventType: eventType
                }, {
                    retryLimit: 5,
                    retryDelay: 60,
                    retryBackoff: true
                });
            }
        }
    }

    /**
     * Worker Handler: Actually send the HTTP request
     */
    static async processJob(job: any) {
        const { eventId, url, secret, payload, eventType } = job.data;
        const timestamp = Date.now();
        const attemptCount = job.attempt_count || 1;
        const managedByCron = job?.meta?.managedByCron === true;
        const maxAttempts = job?.meta?.maxAttempts || 5;

        try {
            // 1. Sign Payload
            // Signature = HMAC-SHA256(timestamp + "." + JSON.stringify(payload), secret)
            const signaturePayload = `${timestamp}.${JSON.stringify(payload)}`;
            const signature = crypto
                .createHmac('sha256', secret)
                .update(signaturePayload)
                .digest('hex');

            // 2. Send Request
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-App-Event': eventType,
                    'X-App-Signature': signature,
                    'X-App-Timestamp': timestamp.toString()
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            }).finally(() => clearTimeout(timeout));

            // 3. Update Log Success
            await supabase.from('webhook_events').update({
                status: 'success',
                response_status: response.status,
                response_body: 'OK', // Don't store full body to save space usually
                last_attempt_at: new Date().toISOString(),
                attempt_count: attemptCount,
                next_attempt_at: null
            }).eq('id', eventId);

        } catch (error: any) {
            // 4. Update Log Failure
            const status = 0;
            const body = error?.name === 'AbortError' ? 'Timeout' : (error?.message || 'Request failed');

            const update: any = {
                status: 'failed',
                response_status: status,
                response_body: body,
                last_attempt_at: new Date().toISOString(),
                attempt_count: attemptCount
            };

            if (managedByCron) {
                const cappedAttempt = Math.min(attemptCount, maxAttempts);
                const seconds = Math.min(60 * 60, Math.pow(2, Math.max(0, cappedAttempt - 1)) * 60);
                update.next_attempt_at = new Date(Date.now() + seconds * 1000).toISOString();
            }

            await supabase.from('webhook_events').update(update).eq('id', eventId);

            // Re-throw to let pg-boss handle retry
            throw error;
        }
    }
}
