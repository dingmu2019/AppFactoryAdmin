
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface CouponVerificationResult {
    valid: boolean;
    discountAmount: number;
    couponId?: string;
    message?: string;
}

export class CouponService {

    /**
     * Verify a coupon code and calculate potential discount
     */
    static async verifyCoupon(appId: string, code: string, orderTotal: number, userId?: string): Promise<CouponVerificationResult> {
        // 1. Fetch Coupon
        const { data: coupon, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('app_id', appId)
            .eq('code', code)
            .eq('is_active', true)
            .single();

        if (error || !coupon) {
            return { valid: false, discountAmount: 0, message: 'Invalid or expired coupon code' };
        }

        // 2. Check Constraints
        const now = new Date();
        if (coupon.start_at && new Date(coupon.start_at) > now) {
            return { valid: false, discountAmount: 0, message: 'Coupon not yet active' };
        }
        if (coupon.end_at && new Date(coupon.end_at) < now) {
            return { valid: false, discountAmount: 0, message: 'Coupon expired' };
        }
        if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
            return { valid: false, discountAmount: 0, message: 'Coupon usage limit reached' };
        }
        if (orderTotal < (coupon.min_purchase || 0)) {
            return { valid: false, discountAmount: 0, message: `Minimum purchase of ${coupon.min_purchase} required` };
        }

        // 3. Calculate Discount
        let discount = 0;
        if (coupon.type === 'fixed') {
            discount = coupon.value;
        } else if (coupon.type === 'percent') {
            discount = orderTotal * (coupon.value / 100);
            if (coupon.max_discount && discount > coupon.max_discount) {
                discount = coupon.max_discount;
            }
        }

        // Ensure discount doesn't exceed total
        if (discount > orderTotal) discount = orderTotal;

        return {
            valid: true,
            discountAmount: parseFloat(discount.toFixed(2)),
            couponId: coupon.id,
            message: 'Coupon applied successfully'
        };
    }

    /**
     * Record coupon usage (Atomically increment count)
     */
    static async recordUsage(couponId: string, userId: string, orderId: string, discountAmount: number) {
        // 1. Insert Usage Record
        const { error } = await supabase
            .from('coupon_usages')
            .insert({
                coupon_id: couponId,
                user_id: userId,
                order_id: orderId,
                discount_amount: discountAmount
            });

        if (error) throw error;

        // 2. Increment Coupon Usage Count
        // Using RPC or simple update (RPC is better for concurrency, but simple update ok for low volume)
        await supabase.rpc('increment_coupon_usage', { row_id: couponId });
    }
}
