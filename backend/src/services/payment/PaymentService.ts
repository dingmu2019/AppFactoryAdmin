
import { createClient } from '@supabase/supabase-js';
import { StripeAdapter } from './adapters/StripeAdapter.ts';
import { WeChatPayAdapter } from './adapters/WeChatPayAdapter.ts';
import { AlipayAdapter } from './adapters/AlipayAdapter.ts';
import type { IPaymentAdapter, PaymentResult, WebhookResult } from './interfaces.ts';
import { EncryptionService } from '../EncryptionService.ts';
import { WebhookService } from '../WebhookService.ts';
import { FulfillmentService } from '../FulfillmentService.ts';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase Client for Config Retrieval
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export class PaymentService {
    
    /**
     * Factory method to get the correct adapter based on provider name
     * or load the default enabled provider if none specified.
     */
    private static async getAdapter(providerName?: string): Promise<IPaymentAdapter> {
        let query = supabase
            .from('integration_configs')
            .select('config')
            .eq('category', 'payment')
            .eq('is_enabled', true);

        const { data, error } = await query;

        if (error || !data || data.length === 0) {
            throw new Error('No active payment provider configured');
        }

        // Find the matching provider
        let configToUse = data[0].config;
        if (providerName) {
            const found = data.find(d => d.config.provider === providerName);
            if (found) configToUse = found.config;
            else throw new Error(`Provider ${providerName} not found or disabled`);
        }

        // Decrypt Secrets if encrypted
        // We check for specific keys that might be encrypted
        const sensitiveKeys = ['secretKey', 'privateKey', 'apiKey'];
        for (const key of sensitiveKeys) {
            if (configToUse[key] && typeof configToUse[key] === 'string' && configToUse[key].includes(':')) {
                // Heuristic check: encrypted strings have colons (iv:tag:content)
                try {
                    configToUse[key] = EncryptionService.decrypt(configToUse[key]);
                } catch (ignore) {
                    // Ignore if not actually encrypted or legacy
                }
            }
        }

        const provider = configToUse.provider || 'stripe';
        let adapter: IPaymentAdapter;

        switch (provider) {
            case 'stripe':
                adapter = new StripeAdapter();
                break;
            case 'wechat_pay':
                adapter = new WeChatPayAdapter();
                break;
            case 'alipay':
                adapter = new AlipayAdapter();
                break;
            default:
                throw new Error(`Unsupported payment provider: ${provider}`);
        }

        adapter.initialize(configToUse);
        return adapter;
    }

    /**
     * Initiate a payment for an order
     */
    static async createPayment(params: {
        orderId: string;
        userId: string;
        amount: number;
        currency?: string;
        provider?: string;
    }): Promise<PaymentResult> {
        const { orderId, userId, amount, currency = 'cny', provider } = params;
        
        try {
            const adapter = await this.getAdapter(provider);
            const result = await adapter.createPaymentIntent(amount, currency, {
                orderId,
                userId
            });

            // Log attempt
            console.log(`[Payment] Created intent for Order ${orderId}: ${result.status}`);
            
            return result;
        } catch (error: any) {
            console.error('[Payment] Create Failed:', error);
            throw error;
        }
    }

    /**
     * Handle Webhook Callbacks
     */
    static async handleWebhook(provider: string, payload: string | Buffer, signature: string): Promise<WebhookResult> {
        const adapter = await this.getAdapter(provider);
        
        // 1. Verify
        const isValid = await adapter.verifyWebhookSignature(payload, signature);
        if (!isValid) {
            throw new Error('Invalid Webhook Signature');
        }

        // 2. Process
        const result = await adapter.processWebhookEvent(payload, signature);
        
        // 3. Update Order Status if it's a payment event
        if (result.isPaymentEvent && result.orderId && result.status) {
            await this.updateOrderStatus(result.orderId, result.status, result.data);
        }

        return result;
    }

    /**
     * Internal helper to update order status in DB
     */
    private static async updateOrderStatus(orderId: string, status: 'paid' | 'failed' | 'refunded', rawData: any) {
        // Map payment status to order status
        let orderStatus = 'pending';
        let payStatus = 'unpaid';

        if (status === 'paid') {
            orderStatus = 'paid';
            payStatus = 'success';
        } else if (status === 'failed') {
            payStatus = 'fail';
        }

        const { data: order, error } = await supabase
            .from('orders')
            .update({
                status: orderStatus,
                pay_status: payStatus,
                pay_time: status === 'paid' ? new Date().toISOString() : null,
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId)
            .neq('pay_status', 'success')
            .select('id, app_id, user_id, order_type, items_snapshot, pay_status') // Fetch fields for downstream handlers
            .maybeSingle();

        if (error) {
            console.error(`[Payment] Failed to update order ${orderId}:`, error);
            return;
        }

        if (!order) {
            return;
        }

        if (status === 'paid') {
            try {
                // Trigger fulfillment flow (asynchronous)
                await FulfillmentService.dispatchFulfillment(orderId);
            } catch (e) {
                console.error('[Payment] Fulfillment dispatch failed:', e);
            }
        }

            console.log(`[Payment] Order ${orderId} updated to ${status}`);
            
            // Dispatch Webhook
            const eventType = status === 'paid' ? 'ORDER.PAID' : 'ORDER.PAYMENT_FAILED';
            await WebhookService.dispatch(order.app_id, eventType, {
                orderId: orderId,
                status: status,
                timestamp: new Date().toISOString(),
                data: rawData
            });
    }
}
