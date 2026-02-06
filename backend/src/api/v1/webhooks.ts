
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAppUser } from '../../middleware/appAuth.ts';
import crypto from 'crypto';

const router = express.Router();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * @openapi
 * /api/v1/webhooks:
 *   get:
 *     tags: [Webhooks]
 *     summary: List webhooks
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of webhooks
 */
router.get('/', requireAppUser, async (req, res) => {
    try {
        const appId = req.appUser?.app_id;
        
        const { data, error } = await supabase
            .from('webhooks')
            .select('*')
            .eq('app_id', appId);

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/v1/webhooks:
 *   post:
 *     tags: [Webhooks]
 *     summary: Create a webhook
 *     security:
 *       - BearerAuth: []
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
 *         description: Webhook created
 */
router.post('/', requireAppUser, async (req, res) => {
    try {
        const appId = req.appUser?.app_id;
        const { url, events, description } = req.body;

        if (!url || !events || !Array.isArray(events) || events.length === 0) {
            return res.status(400).json({ error: 'URL and events array are required' });
        }

        // Generate a random secret for signing
        const secret = crypto.randomBytes(32).toString('hex');

        const { data, error } = await supabase
            .from('webhooks')
            .insert({
                app_id: appId,
                url,
                events,
                secret,
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
 * /api/v1/webhooks/{id}:
 *   delete:
 *     tags: [Webhooks]
 *     summary: Delete a webhook
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
 *         description: Webhook deleted
 */
router.delete('/:id', requireAppUser, async (req, res) => {
    try {
        const appId = req.appUser?.app_id;
        const id = req.params.id;

        const { error } = await supabase
            .from('webhooks')
            .delete()
            .eq('id', id)
            .eq('app_id', appId); // Ensure ownership

        if (error) throw error;
        
        res.json({ success: true, message: 'Webhook deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
