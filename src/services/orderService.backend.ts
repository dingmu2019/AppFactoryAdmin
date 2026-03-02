
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { JobQueue } from './jobQueue';
import { CouponService } from './CouponService';
import { CreditsService } from './CreditsService';

interface CreateOrderParams {
    userId: string;
    appId: string;
    items: {
        productId: string;
        quantity: number;
        sku?: string;
    }[];
    shippingInfo?: any;
    couponCode?: string; // Add coupon code
}

export class OrderService {
    static getSupabase() {
        return supabase;
    }

    /**
     * Create a new order with inventory check and reservation
     */
    static async createOrder(params: CreateOrderParams) {
        const { userId, appId, items, shippingInfo, couponCode } = params;

        // 1. Validate & Calculate Price (Snapshot)
        // We need to fetch product details to get price and check stock
        const productIds = items.map(i => i.productId);
        const { data: products, error: prodError } = await supabase
            .from('products')
            .select('id, price, name, stock, type, specs')
            .in('id', productIds);
        
        if (prodError || !products) {
            throw new Error('Failed to fetch product information');
        }

        let totalAmount = 0;
        const itemsSnapshot = [];

        let hasCredits = false;
        let hasNonCredits = false;

        for (const item of items) {
            const product = products.find((p: any) => p.id === item.productId);
            if (!product) throw new Error(`Product ${item.productId} not found`);

            const productType = (product as any).type ? String((product as any).type) : '';
            const isCredits = productType === 'credits';
            if (isCredits) hasCredits = true;
            else hasNonCredits = true;

            if (!isCredits) {
                if (typeof product.stock === 'number' && product.stock < item.quantity) {
                    throw new Error(`Insufficient stock for product ${product.name}`);
                }
            }

            const itemTotal = product.price * item.quantity;
            totalAmount += itemTotal;

            const specs = (product as any).specs || null;
            const credits = isCredits
                ? Number((specs && (specs.credits ?? specs.credit ?? specs.points)) ?? 0) * item.quantity
                : 0;
            
            itemsSnapshot.push({
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: item.quantity,
                sku: item.sku,
                subtotal: itemTotal,
                type: productType || null,
                specs,
                credits: credits > 0 ? credits : null
            });
        }

        // 1.5 Apply Coupon (If provided)
        let discountAmount = 0;
        let finalPayAmount = totalAmount;
        let appliedCouponId = null;

        if (couponCode) {
            const verification = await CouponService.verifyCoupon(appId, couponCode, totalAmount, userId);
            if (!verification.valid) {
                throw new Error(`Invalid Coupon: ${verification.message}`);
            }
            discountAmount = verification.discountAmount;
            finalPayAmount = totalAmount - discountAmount;
            appliedCouponId = verification.couponId;
        }

        // 2. Create Order & Deduct Inventory
        const orderNo = `ORD-${Date.now()}-${Math.floor(Math.random()*1000)}`;
        
        const orderType = hasCredits && !hasNonCredits ? 'credits' : hasCredits && hasNonCredits ? 'mixed' : 'commerce';

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                order_no: orderNo,
                app_id: appId,
                user_id: userId,
                total_amount: totalAmount,
                discount_amount: discountAmount, // Record discount
                pay_amount: finalPayAmount < 0 ? 0 : finalPayAmount, // Ensure no negative
                status: 'pending',
                pay_status: 'unpaid',
                items_snapshot: itemsSnapshot,
                shipping_info: shippingInfo || {},
                order_type: orderType,
                // We might want to store coupon code in metadata or extra column, but discount_amount is key
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // 2.1 Record Coupon Usage (If applied)
        if (appliedCouponId && order) {
            try {
                await CouponService.recordUsage(appliedCouponId, userId, order.id, discountAmount);
            } catch (err) {
                console.error('Failed to record coupon usage:', err);
                // Non-fatal? Or should we rollback order?
                // Ideally transactional. For now, we proceed.
            }
        }

        // 2.2 Deduct Inventory
        // We schedule a job or do it immediately. Immediate is better for sync response.
        try {
            const inventoryItems = (itemsSnapshot as any[])
                .filter((it: any) => it?.type !== 'credits')
                .map((it: any) => ({ productId: it.productId, quantity: it.quantity }));
            if (inventoryItems.length > 0) {
                await this.deductInventory(inventoryItems);
            }
        } catch (err) {
            // Rollback: Cancel Order
            await supabase.from('orders').update({ status: 'cancelled', pay_status: 'fail' }).eq('id', order.id);
            throw new Error('Inventory deduction failed. Order cancelled.');
        }

        // 3. Schedule Auto-Cancel Job (e.g., 30 mins expiration)
        // We use pg-boss to schedule a delayed job
        if (!process.env.VERCEL) {
            await JobQueue.schedule('cancel-unpaid-order', { orderId: order.id }, { startAfter: 30 * 60 });
        }

        return order;
    }

    /**
     * Deduct inventory for items
     * This should ideally be atomic.
     */
    private static async deductInventory(items: { productId: string, quantity: number }[]) {
        for (const item of items) {
             // Atomic decrement: update products set stock = stock - qty where id = pid and stock >= qty
             // We can use an RPC for this, or raw query if using a driver that supports it.
             // With Supabase JS, we can use `.rpc()`
             
             const { error } = await supabase.rpc('decrement_stock', { 
                 row_id: item.productId, 
                 quantity: item.quantity 
             });
             
             if (error) {
                 // If RPC missing or fails (e.g. constraint violation check_stock)
                 throw new Error(`Failed to deduct stock for ${item.productId}`);
             }
        }
    }

    /**
     * Cancel an order (Manual or Auto)
     * Release inventory back.
     */
    static async cancelOrder(orderId: string, reason: string = 'timeout') {
        // 1. Get Order
        const { data: order } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();
            
        if (!order) return;
        if (order.status === 'cancelled' || order.status === 'paid' || order.status === 'shipped') {
            return; // Already processed
        }

        // 2. Update Status
        await supabase
            .from('orders')
            .update({ status: 'cancelled', pay_status: 'closed' }) // 'closed' or 'timeout'
            .eq('id', orderId);

        // 3. Restore Inventory
        const items = order.items_snapshot;
        if (Array.isArray(items)) {
            for (const item of items) {
                 await supabase.rpc('increment_stock', { 
                     row_id: item.productId, 
                     quantity: item.quantity 
                 });
            }
        }
        
        console.log(`Order ${orderId} cancelled due to ${reason}`);
    }

    /**
     * Handle Refund Hook
     */
    static async handleRefund(orderId: string, refundId: string, amount: number, revokeBenefits: boolean) {
        // 1. Fetch Order to calculate ratio
        const { data: order } = await supabase
            .from('orders')
            .select('pay_amount, total_amount, status')
            .eq('id', orderId)
            .single();
        
        if (!order) return;

        // 2. If revokeBenefits is true, reclaim proportional credits
        if (revokeBenefits && order.pay_amount > 0) {
            const ratio = amount / order.pay_amount;
            await CreditsService.revokeFromRefund(orderId, refundId, ratio);
        }

        // 3. Update Order Status if necessary
        // If it's a full refund, mark as refunded
        const { data: refunds } = await supabase
            .from('refunds')
            .select('amount')
            .eq('order_id', orderId)
            .eq('status', 'success');
        
        const totalRefunded = (refunds || []).reduce((sum, r) => sum + Number(r.amount), 0);
        
        if (totalRefunded >= order.pay_amount) {
            await supabase.from('orders').update({ status: 'refunded' }).eq('id', orderId);
        }
    }
}
