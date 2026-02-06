
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAppUser } from '../../middleware/appAuth.ts';

const router = express.Router();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * @openapi
 * /api/v1/alerts:
 *   get:
 *     tags: [Alerts]
 *     summary: List system alerts
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of alerts
 */
router.get('/', requireAppUser, async (req, res) => {
    try {
        const appId = req.appUser?.app_id;
        const { limit = 20, level } = req.query;

        let query = supabase
            .from('system_error_logs')
            .select('*')
            .eq('app_id', appId)
            .order('created_at', { ascending: false })
            .limit(Number(limit));

        if (level) {
            query = query.eq('level', level);
        }

        const { data, error } = await query;

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
