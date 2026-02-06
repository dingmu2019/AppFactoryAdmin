
import express from 'express';
import { requireAuth } from '../../middleware/auth.ts';
import { WebhookService } from '../../services/WebhookService.ts';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * @openapi
 * /api/admin/webhooks:
 *   get:
 *     tags: [Admin - Webhooks]
 *     summary: List webhooks
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-app-id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of webhooks
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const appId = req.headers['x-app-id'] as string;
        if (!appId) {
            return res.status(400).json({ error: 'Missing x-app-id header' });
        }
        
        const { data, error } = await supabase
            .from('webhooks')
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
 * /api/admin/webhooks:
 *   post:
 *     tags: [Admin - Webhooks]
 *     summary: Create a webhook
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-app-id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url, events]
 *             properties:
 *               url:
 *                 type: string
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created webhook
 */
router.post('/', requireAuth, async (req, res) => {
    try {
        const appId = req.headers['x-app-id'] as string;
        if (!appId) {
            return res.status(400).json({ error: 'Missing x-app-id header' });
        }

        const { url, events, description } = req.body;

        if (!url || !events || !Array.isArray(events) || events.length === 0) {
            return res.status(400).json({ error: 'URL and at least one event are required' });
        }

        const webhook = await WebhookService.createWebhook(appId, url, events, description);
        res.status(201).json({ success: true, data: webhook });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/admin/webhooks/{id}:
 *   delete:
 *     tags: [Admin - Webhooks]
 *     summary: Delete a webhook
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-app-id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Webhook deleted
 */
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const appId = req.headers['x-app-id'] as string;
        if (!appId) {
            return res.status(400).json({ error: 'Missing x-app-id header' });
        }
        
        const { id } = req.params;

        const { error } = await supabase
            .from('webhooks')
            .delete()
            .eq('id', id)
            .eq('app_id', appId);

        if (error) throw error;
        res.json({ success: true, message: 'Webhook deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
