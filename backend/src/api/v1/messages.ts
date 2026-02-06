
import express from 'express';
import { MessageService } from '../../services/message/MessageService.ts';
import type { MessageChannel } from '../../services/message/MessageService.ts';
import { requireAppUser } from '../../middleware/appAuth.ts';

const router = express.Router();

/**
 * @openapi
 * /api/v1/messages/send:
 *   post:
 *     tags: [Messages]
 *     summary: Send a message
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [channel, recipient]
 *             properties:
 *               channel:
 *                 type: string
 *                 enum: [email, sms, whatsapp, wechat, feishu, lark]
 *               recipient:
 *                 type: string
 *               content:
 *                 type: string
 *               subject:
 *                 type: string
 *               template_code:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Message sent
 */
router.post('/send', requireAppUser, async (req, res) => {
    try {
        const { channel, recipient, content, subject, template_code, data } = req.body;
        const appId = req.appUser?.app_id;
        
        if (!channel || !recipient) {
            return res.status(400).json({ error: 'Missing required fields: channel, recipient' });
        }

        const validChannels: MessageChannel[] = ['email', 'sms', 'whatsapp', 'wechat', 'feishu', 'lark'];
        if (!validChannels.includes(channel)) {
            return res.status(400).json({ error: `Invalid channel. Supported: ${validChannels.join(', ')}` });
        }

        let result;

        // Use Template Engine if template_code is provided
        if (template_code) {
            result = await MessageService.sendTemplateMessage(
                channel as MessageChannel, 
                template_code, 
                data || {}, 
                { recipient, subject }, 
                appId
            );
        } else {
            // Legacy/Direct Content Mode
            if (!content) {
                return res.status(400).json({ error: 'Missing required field: content (or template_code)' });
            }
            result = await MessageService.sendMessage(channel as MessageChannel, {
                recipient,
                content,
                subject
            }, appId); 
        }

        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }

    } catch (error: any) {
        console.error('Send Message Error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
