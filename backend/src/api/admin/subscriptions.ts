import express from 'express';
import { requireAdmin } from '../../middleware/auth.ts';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

router.use(requireAdmin);

/**
 * @openapi
 * /api/admin/subscriptions:
 *   get:
 *     tags: [Admin - Subscriptions]
 *     summary: List all subscriptions
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *       - in: query
 *         name: appId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of subscriptions
 */
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 20;
        const appId = req.query.appId as string;
        const status = req.query.status as string;
        const search = req.query.search as string;

        let query = supabase
            .from('subscriptions')
            .select('*, saas_apps(name)', { count: 'exact' });

        if (appId) {
            query = query.eq('app_id', appId);
        }

        if (status) {
            query = query.eq('status', status);
        }

        if (search) {
            // Search by subscription ID or user email
            // Note: Joining search on related tables in Supabase is tricky with simple filters.
            // We'll search by subscription ID directly or try to filter.
            // For now, simple search on ID.
            query = query.ilike('id', `%${search}%`);
        }

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        // Manually fetch users because 'subscriptions' references 'auth.users' which is not directly joinable via PostgREST public API
        // We use 'public.users' instead which mirrors 'auth.users'
        let enrichedData = data;
        if (data && data.length > 0) {
            const userIds = [...new Set(data.map((s: any) => s.user_id))];
            const { data: users } = await supabase
                .from('users') // public.users
                .select('id, email, full_name')
                .in('id', userIds);

            const userMap = new Map(users?.map((u: any) => [u.id, u]) || []);
            
            enrichedData = data.map((s: any) => ({
                ...s,
                user: userMap.get(s.user_id) || { email: 'Unknown', full_name: 'Unknown' }
            }));
        }

        res.json({
            success: true,
            data: enrichedData,
            total: count,
            page,
            pageSize,
            totalPages: count ? Math.ceil(count / pageSize) : 0
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
