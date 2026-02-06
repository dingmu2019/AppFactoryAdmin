import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../../middleware/auth.ts';

const router = express.Router();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

router.use(requireAdmin);

/**
 * @openapi
 * /api/admin/coupons:
 *   get:
 *     tags: [Admin - Coupons]
 *     summary: List coupons
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: app_id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of coupons
 */
router.get('/', async (req, res) => {
  try {
    const appId = typeof req.query.app_id === 'string' ? req.query.app_id : undefined;

    let query = supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (appId) {
      query = query.eq('app_id', appId);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/admin/coupons:
 *   post:
 *     tags: [Admin - Coupons]
 *     summary: Create a coupon
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [app_id, code, type, value]
 *             properties:
 *               app_id:
 *                 type: string
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
router.post('/', async (req, res) => {
  try {
    const { app_id, code, type, value, min_purchase, usage_limit, start_at, end_at, description } = req.body;

    if (!app_id) return res.status(400).json({ error: 'app_id is required' });
    if (!code || !type || value === undefined) {
      return res.status(400).json({ error: 'Code, type, and value are required' });
    }

    const { data, error } = await supabase
      .from('coupons')
      .insert({
        app_id,
        code: String(code).toUpperCase(),
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
 * /api/admin/coupons/{id}:
 *   delete:
 *     tags: [Admin - Coupons]
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
 *         description: Coupon deleted
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

