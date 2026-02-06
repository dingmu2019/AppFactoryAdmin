
import express from 'express';
import { PaymentService } from '../../services/payment/PaymentService.ts';
import { requireAppUser } from '../../middleware/appAuth.ts';

const router = express.Router();

/**
 * @openapi
 * /api/v1/payments/create:
 *   post:
 *     tags: [Payments]
 *     summary: Create payment
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, amount]
 *             properties:
 *               orderId:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *               provider:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment created
 */
router.post('/create', requireAppUser, async (req, res) => {
    try {
        const { orderId, amount, currency, provider } = req.body;
        const userId = req.appUser?.sub;

        if (!orderId || !amount) {
            return res.status(400).json({ error: 'Missing required fields: orderId, amount' });
        }

        if (!userId) {
             return res.status(401).json({ error: 'User not authenticated' });
        }

        const result = await PaymentService.createPayment({
            orderId,
            userId,
            amount,
            currency: currency || 'cny',
            provider
        });

        res.json(result);
    } catch (error: any) {
        console.error('Payment Create Error:', error);
        res.status(500).json({ error: error.message || 'Payment creation failed' });
    }
});

/**
 * @openapi
 * /api/v1/payments/webhook/{provider}:
 *   post:
 *     tags: [Payments]
 *     summary: Payment webhook
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook received
 */
router.post('/webhook/:provider', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const { provider } = req.params;
        const signature = req.headers['stripe-signature'] as string; // Or generic header check

        if (!signature) {
            return res.status(400).send('Missing Signature');
        }

        // We need raw body for signature verification
        // Ensure express is configured to preserve raw body or use 'express.raw' middleware above
        const payload = req.body;

        const result = await PaymentService.handleWebhook(provider, payload, signature);

        res.json({ received: true, status: result.status });
    } catch (error: any) {
        console.error(`Webhook Error (${req.params.provider}):`, error.message);
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
});

export default router;
