
import express from 'express';
import { CouponService } from '../../services/CouponService.ts';
import { requireAppUser } from '../../middleware/appAuth.ts';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * @openapi
 * /api/v1/coupons:
 *   get:
 *     tags: [Coupons]
 *     summary: List my coupons
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of coupons
 */
router.get('/', requireAppUser, async (req, res) => {
    try {
        const appId = req.appUser?.app_id;
        const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('app_id', appId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/v1/coupons:
 *   post:
 *     tags: [Coupons]
 *     summary: Create a coupon
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, type, value]
 *             properties:
 *               code:
 *                 type: string
 *               type:
 *                 type: string
 *               value:
 *                 type: number
 *     responses:
 *       201:
 *         description: Created coupon
 */
router.post('/', requireAppUser, async (req, res) => {
    try {
        const appId = req.appUser?.app_id;
        const { code, type, value, min_purchase, usage_limit, start_at, end_at, description } = req.body;

        if (!code || !type || value === undefined) {
            return res.status(400).json({ error: 'Code, type, and value are required' });
        }

        const { data, error } = await supabase
            .from('coupons')
            .insert({
                app_id: appId,
                code: code.toUpperCase(),
                type,
                value,
                min_purchase: min_purchase || 0,
                usage_limit: usage_limit || null,
                start_at: start_at || new Date().toISOString(),
                end_at: end_at || null,
                description,
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/v1/coupons/{id}:
 *   delete:
 *     tags: [Coupons]
 *     summary: Delete a coupon
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.delete('/:id', requireAppUser, async (req, res) => {
    try {
        const appId = req.appUser?.app_id;
        const { id } = req.params;

        const { error } = await supabase
            .from('coupons')
            .delete()
            .eq('id', id)
            .eq('app_id', appId);

        if (error) throw error;
        res.json({ success: true, message: 'Coupon deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/v1/coupons/verify:
 *   post:
 *     tags: [Coupons]
 *     summary: Verify a coupon
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, amount]
 *             properties:
 *               code:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Verification result
 */
router.post('/verify', requireAppUser, async (req, res) => {
    try {
        const { code, amount } = req.body;
        const appId = req.appUser?.app_id;
        const userId = req.appUser?.sub;

        if (!code || amount === undefined) {
            return res.status(400).json({ error: 'Code and amount are required' });
        }

        if (!appId) {
             return res.status(401).json({ error: 'User not authenticated' });
        }

        const result = await CouponService.verifyCoupon(appId, code, Number(amount), userId);

        res.json({
            success: result.valid,
            data: {
                discountAmount: result.discountAmount,
                finalAmount: Number(amount) - result.discountAmount,
                message: result.message
            }
        });

    } catch (error: any) {
        console.error('Verify Coupon Error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
