
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { WebhookService } from './WebhookService.ts';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface SubscriptionData {
    appId: string;
    userId: string;
    provider: string;
    externalSubscriptionId: string;
    externalCustomerId: string;
    planKey: string;
    status: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd?: boolean;
}

export class SubscriptionService {

    /**
     * Sync subscription data from Provider (e.g. Stripe Webhook)
     */
    static async syncSubscription(data: SubscriptionData) {
        // 1. Upsert Subscription Record
        const { data: sub, error } = await supabase
            .from('subscriptions')
            .upsert({
                app_id: data.appId,
                user_id: data.userId,
                provider: data.provider,
                external_subscription_id: data.externalSubscriptionId,
                external_customer_id: data.externalCustomerId,
                plan_key: data.planKey,
                status: data.status,
                current_period_start: data.currentPeriodStart.toISOString(),
                current_period_end: data.currentPeriodEnd.toISOString(),
                cancel_at_period_end: data.cancelAtPeriodEnd || false,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'app_id, external_subscription_id'
            })
            .select()
            .single();

        if (error) {
            console.error('[Subscription] Sync failed:', error);
            throw error;
        }

        // 2. Update User Relation (Cache status)
        // We only update if this is the "latest" active subscription
        if (data.status === 'active' || data.status === 'trialing') {
            await supabase
                .from('user_app_relations')
                .update({
                    subscription_status: data.status,
                    current_period_end: data.currentPeriodEnd.toISOString(),
                    vip_level: data.planKey // Map plan to VIP level?
                })
                .eq('user_id', data.userId)
                .eq('app_id', data.appId);
        } else if (data.status === 'canceled' || data.status === 'unpaid') {
             // Downgrade if no other active sub? 
             // Simplification: Set to expired
             await supabase
                .from('user_app_relations')
                .update({
                    subscription_status: data.status
                })
                .eq('user_id', data.userId)
                .eq('app_id', data.appId);
        }

        // 3. Dispatch Webhook to App
        await WebhookService.dispatch(data.appId, `SUBSCRIPTION.${data.status.toUpperCase()}`, {
            userId: data.userId,
            plan: data.planKey,
            expiry: data.currentPeriodEnd
        });

        console.log(`[Subscription] Synced ${data.externalSubscriptionId} for user ${data.userId}`);
    }

    /**
     * Locate User ID by External Customer ID (Stripe ID)
     * This requires us to store Stripe Customer ID on the user mapping first.
     * Or we can search subscriptions table if we already have a record.
     */
    static async getUserByExternalId(appId: string, externalCustomerId: string): Promise<string | null> {
        // Try finding existing subscription
        const { data } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('app_id', appId)
            .eq('external_customer_id', externalCustomerId)
            .limit(1)
            .single();
            
        if (data) return data.user_id;

        // Fallback: Check user_app_relations custom_data? 
        // Or we assume the initial checkout session metadata contained user_id and we handled it there.
        return null;
    }
}
