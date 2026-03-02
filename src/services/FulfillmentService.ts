
import { supabase } from '../lib/supabase';
import { CreditsService } from './CreditsService';
import { SubscriptionService } from './SubscriptionService';
import { WebhookService } from './WebhookService';
import { JobQueue } from './jobQueue';

export class FulfillmentService {
    /**
     * Entry point to trigger fulfillment for a paid order.
     * Usually called from PaymentService or a background job.
     */
    static async dispatchFulfillment(orderId: string) {
        console.log(`[Fulfillment] Dispatching fulfillment for order: ${orderId}`);
        
        // Use JobQueue for asynchronous processing to ensure reliability and retries
        await JobQueue.schedule('fulfill-order', { orderId }, {
            retryLimit: 5,
            retryDelay: 60, // 1 minute delay between retries
            expireIn: '1 hour'
        });
    }

    /**
     * The actual fulfillment logic. Should be idempotent.
     */
    static async fulfillOrder(orderId: string) {
        // 1. Fetch Order with locking/atomic check
        const { data: order, error: fetchError } = await supabase
            .from('orders')
            .select('*, saas_apps(name)')
            .eq('id', orderId)
            .single();

        if (fetchError || !order) {
            throw new Error(`Order ${orderId} not found for fulfillment`);
        }

        // 2. Idempotency Check
        if (order.provision_status === 'completed') {
            console.log(`[Fulfillment] Order ${orderId} already fulfilled. Skipping.`);
            return;
        }

        // 3. Mark as Processing
        await supabase
            .from('orders')
            .update({ 
                provision_status: 'processing',
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

        try {
            const items = order.items_snapshot;
            if (!Array.isArray(items)) {
                throw new Error('Invalid items snapshot in order');
            }

            console.log(`[Fulfillment] Processing ${items.length} items for order ${orderId}`);

            // 4. Process each item based on type
            for (const item of items) {
                const type = item.type || 'unknown';
                
                switch (type) {
                    case 'credits':
                        await this.fulfillCredits(orderId);
                        break;
                    case 'subscription':
                        // Subscriptions are often handled by Stripe Webhooks directly, 
                        // but we can add secondary sync logic here if needed.
                        await this.fulfillSubscription(order, item);
                        break;
                    default:
                        console.warn(`[Fulfillment] Unknown product type: ${type} for item ${item.productId}`);
                }
            }

            // 5. Finalize Success
            await supabase
                .from('orders')
                .update({ 
                    provision_status: 'completed',
                    status: 'completed', // Mark overall order as completed
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            // 6. Notify via Webhook
            await WebhookService.dispatch(order.app_id, 'ORDER.FULFILLED', {
                orderId: order.id,
                orderNo: order.order_no,
                status: 'completed',
                timestamp: new Date().toISOString()
            });

            console.log(`[Fulfillment] Order ${orderId} fulfilled successfully`);

        } catch (error: any) {
            console.error(`[Fulfillment] Fulfillment failed for order ${orderId}:`, error);
            
            // Mark as Failed for visibility
            await supabase
                .from('orders')
                .update({ 
                    provision_status: 'failed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            throw error; // Throwing allows JobQueue to retry
        }
    }

    private static async fulfillCredits(orderId: string) {
        // 1. App-level AI Credits (via RPC)
        const result = await CreditsService.topupFromPaidOrder(orderId);
        if (!result.ok) {
            console.warn(`[Fulfillment] App-level credits topup returned not OK for order ${orderId}`);
        }

        // 2. User-level Points/Credits (update user_app_relations)
        const { data: order, error: orderErr } = await supabase
            .from('orders')
            .select('user_id, app_id, items_snapshot')
            .eq('id', orderId)
            .single();

        if (orderErr || !order) throw new Error(`Order ${orderId} not found for user-level fulfillment`);

        let totalPoints = 0;
        const items = order.items_snapshot;
        if (Array.isArray(items)) {
            for (const item of items) {
                if (item.type === 'credits') {
                    const itemPoints = Number(item.credits || item.specs?.credits || 0);
                    totalPoints += itemPoints;
                }
            }
        }

        if (totalPoints > 0) {
            const { error: updateErr } = await supabase.rpc('increment_user_app_points', {
                p_user_id: order.user_id,
                p_app_id: order.app_id,
                p_points: totalPoints
            });

            if (updateErr) {
                console.error(`[Fulfillment] Failed to update user points via RPC:`, updateErr);
                // Fallback: manual update
                const { data: rel } = await supabase
                    .from('user_app_relations')
                    .select('points')
                    .eq('user_id', order.user_id)
                    .eq('app_id', order.app_id)
                    .single();
                
                await supabase
                    .from('user_app_relations')
                    .update({ 
                        points: (rel?.points || 0) + totalPoints,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', order.user_id)
                    .eq('app_id', order.app_id);
            }
            console.log(`[Fulfillment] User-level points granted: ${totalPoints}`);
        }
    }

    private static async fulfillSubscription(order: any, item: any) {
        // Extract plan details from item specs
        const planKey = item.plan_key || item.specs?.plan_key || item.specs?.vip_level;
        
        if (planKey) {
            const { error } = await supabase
                .from('user_app_relations')
                .update({
                    subscription_status: 'active',
                    vip_level: planKey,
                    current_period_end: order.billing_cycle === 'yearly' 
                        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                        : new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString()
                })
                .eq('user_id', order.user_id)
                .eq('app_id', order.app_id);

            if (error) throw error;
            console.log(`[Fulfillment] Subscription activated for user ${order.user_id} on plan: ${planKey}`);
            
            // Also insert into a dedicated subscriptions table for history/tracking
            await supabase.from('subscriptions').insert({
                user_id: order.user_id,
                app_id: order.app_id,
                order_id: order.id,
                plan_id: item.productId,
                status: 'active',
                current_period_end: order.billing_cycle === 'yearly' 
                    ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                    : new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString()
            });
        }
    }
}
