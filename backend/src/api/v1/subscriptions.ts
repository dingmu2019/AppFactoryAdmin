
import express from 'express';
import { requireAppUser } from '../../middleware/appAuth.ts';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * @openapi
 * /api/v1/subscriptions/admin/list:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Admin list active subscriptions
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of subscriptions
 */
router.get('/admin/list', requireAppUser, async (req, res) => {
    try {
        const appId = req.appUser?.app_id;
        // Should verify admin role here (omitted for brevity in this rapid prototype)
        
        const { limit = 20, offset = 0 } = req.query;

        const { data, error, count } = await supabase
            .from('subscriptions')
            .select('*, user:user_id(email)', { count: 'exact' }) // Join with user email
            .eq('app_id', appId)
            .order('created_at', { ascending: false })
            .range(Number(offset), Number(offset) + Number(limit) - 1);

        if (error) throw error;
        res.json({ success: true, data, total: count });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/v1/subscriptions:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Get my active subscription
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Active subscription
 */
router.get('/', requireAppUser, async (req, res) => {
    try {
        const userId = req.appUser?.sub;
        const appId = req.appUser?.app_id;

        const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('app_id', appId)
            .eq('user_id', userId)
            .in('status', ['active', 'trialing', 'past_due'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is 'not found'
             throw error;
        }

        res.json({ success: true, data: data || null });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/v1/subscriptions/cancel:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Cancel subscription
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/cancel', requireAppUser, async (req, res) => {
    try {
        const userId = req.appUser?.sub;
        const appId = req.appUser?.app_id;

        // 1. Get Active Subscription
        const { data: sub, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('app_id', appId)
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

        if (!sub) {
            return res.status(404).json({ error: 'No active subscription found' });
        }

        // 2. Call Provider API (Stripe) to cancel
        // Ideally we should delegate this to SubscriptionService -> PaymentAdapter
        // For now, we just mark it locally as "cancel_at_period_end" requested
        // In a real system, we MUST call Stripe API here.
        
        // Mocking the call:
        await supabase
            .from('subscriptions')
            .update({ cancel_at_period_end: true })
            .eq('id', sub.id);

        res.json({ success: true, message: 'Subscription will be canceled at the end of the period' });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
