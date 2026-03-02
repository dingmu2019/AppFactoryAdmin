
import type { IPaymentAdapter, PaymentResult, WebhookResult } from '../interfaces';
import Stripe from 'stripe';
import { SubscriptionService } from '../../SubscriptionService';

export class StripeAdapter implements IPaymentAdapter {
    private stripe: Stripe | null = null;
    private config: any = null;

    initialize(config: any): void {
        if (!config.secretKey) {
            throw new Error('Stripe secretKey is required');
        }
        this.config = config;
        this.stripe = new Stripe(config.secretKey, {
            apiVersion: '2025-01-27.acacia' as any, // Cast to any to bypass strict literal check if types are outdated
        });
    }

    // Implementing IPaymentAdapter correctly
    async createPaymentIntent(amount: number, currency: string, metadata?: any): Promise<PaymentResult> {
        const orderId = typeof metadata?.orderId === 'string' && metadata.orderId ? metadata.orderId : 'unknown-order';
        return this.createPayment(orderId, amount, currency, 'Payment', metadata);
    }

    // Helper method (not part of interface but used internally or could be refactored)
    async createPayment(orderId: string, amount: number, currency: string, description: string, metadata?: any): Promise<PaymentResult> {
        if (!this.stripe) throw new Error('Stripe not initialized');

        try {
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: Math.round(amount * 100), // cents
                currency: currency.toLowerCase(),
                description,
                metadata: { ...metadata, orderId }
            });

            return {
                success: true,
                transactionId: paymentIntent.id,
                status: 'pending',
                clientSecret: paymentIntent.client_secret || undefined,
                rawResponse: paymentIntent
            };
        } catch (error: any) {
            return {
                success: false,
                transactionId: '',
                status: 'failed',
                error: error.message
            };
        }
    }

    async verifyWebhookSignature(payload: string | Buffer, signature: string): Promise<boolean> {
         if (!this.stripe || !this.config.webhookSecret) return false;
         try {
             this.stripe.webhooks.constructEvent(payload, signature, this.config.webhookSecret);
             return true;
         } catch (err) {
             console.error('Webhook signature verification failed:', err);
             return false;
         }
    }

    async processWebhookEvent(payload: string | Buffer, signature: string): Promise<WebhookResult> {
        if (!this.stripe || !this.config.webhookSecret) {
            throw new Error('Stripe webhook not configured');
        }

        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(
                payload,
                signature,
                this.config.webhookSecret
            );
        } catch (err: any) {
            throw new Error(`Webhook Signature Verification Failed: ${err.message}`);
        }

        const type = event.type;
        const data = event.data.object as any;
        const orderId = data.metadata?.orderId;
        let status: 'paid' | 'failed' | 'refunded' | null = null;

        console.log(`[Stripe] Received event: ${type}`);

        // Handle Subscription Events
        if (type.startsWith('customer.subscription.') || type === 'invoice.payment_succeeded') {
            await this.handleSubscriptionEvent(event);
            // Return dummy success for non-payment events
            return {
                type: type,
                data: data,
                isPaymentEvent: false,
                orderId: orderId || 'subscription-event'
            };
        }

        // Handle One-Time Payments
        switch (type) {
            case 'payment_intent.succeeded':
                status = 'paid';
                break;
            case 'payment_intent.payment_failed':
                status = 'failed';
                break;
        }

        if (status && orderId) {
            return {
                type: type,
                data: data,
                isPaymentEvent: true,
                orderId,
                status
            };
        }

        return { 
            type: type, 
            data: data, 
            isPaymentEvent: false 
        };
    }

    private async handleSubscriptionEvent(event: Stripe.Event) {
        const data = event.data.object as any;
        const appId = this.config.appId; 
        
        const metadata = data.metadata || {}; 
        const userId = metadata.userId; 
        
        if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created' || event.type === 'customer.subscription.deleted') {
             let uid = userId;
             if (!uid) {
                 uid = await SubscriptionService.getUserByExternalId(appId, data.customer as string);
             }
             
             if (!uid || !appId) return; 
             
             await SubscriptionService.syncSubscription({
                 appId,
                 userId: uid,
                 provider: 'stripe',
                 externalSubscriptionId: data.id,
                 externalCustomerId: data.customer,
                 planKey: data.items?.data[0]?.price?.lookup_key || 'unknown',
                 status: data.status,
                 currentPeriodStart: new Date(data.current_period_start * 1000),
                 currentPeriodEnd: new Date(data.current_period_end * 1000),
                 cancelAtPeriodEnd: data.cancel_at_period_end
             });
        }
        else if (event.type === 'invoice.payment_succeeded') {
            if (!data.subscription) return;
            
            const sub = await this.stripe!.subscriptions.retrieve(data.subscription as string) as any;
            
            let uid = metadata.userId;
            if (!uid) {
                uid = await SubscriptionService.getUserByExternalId(appId, sub.customer as string);
            }
            
            if (uid) {
                await SubscriptionService.syncSubscription({
                    appId,
                    userId: uid,
                    provider: 'stripe',
                    externalSubscriptionId: sub.id,
                    externalCustomerId: sub.customer as string,
                    planKey: sub.items.data[0].price.lookup_key || 'unknown',
                    status: sub.status,
                    currentPeriodStart: new Date(sub.current_period_start * 1000),
                    currentPeriodEnd: new Date(sub.current_period_end * 1000),
                    cancelAtPeriodEnd: sub.cancel_at_period_end
                });
            }
        }
    }
}
