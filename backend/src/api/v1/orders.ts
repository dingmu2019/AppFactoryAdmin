
import express from 'express';
import { OrderService } from '../../services/OrderService.ts';
import { requireAppUser } from '../../middleware/appAuth.ts';

const router = express.Router();

/**
 * @openapi
 * /api/v1/orders:
 *   post:
 *     tags: [Orders]
 *     summary: Create an order
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *               shippingInfo:
 *                 type: object
 *               couponCode:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created
 */
router.post('/', requireAppUser, async (req, res) => {
    try {
        const userId = req.appUser?.sub;
        const appId = req.appUser?.app_id;
        const { items, shippingInfo, couponCode } = req.body; // Accept couponCode

        if (!userId || !appId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Items array is required' });
        }

        const order = await OrderService.createOrder({
            userId,
            appId,
            items,
            shippingInfo,
            couponCode // Pass to service
        });

        res.status(201).json({ 
            success: true, 
            data: order 
        });

    } catch (error: any) {
        console.error('Create Order Error:', error);
        res.status(400).json({ error: error.message || 'Failed to create order' });
    }
});

/**
 * @openapi
 * /api/v1/orders/{id}/cancel:
 *   post:
 *     tags: [Orders]
 *     summary: Cancel an order
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
 *         description: Order canceled
 */
router.post('/:id/cancel', requireAppUser, async (req, res) => {
    try {
        const orderId = req.params.id;
        if (!orderId || typeof orderId !== 'string') {
            return res.status(400).json({ error: 'Invalid order ID' });
        }
        // Optional: Verify ownership logic here if not handled by Service lookup
        
        await OrderService.cancelOrder(orderId, 'user-request');
        
        res.json({ success: true, message: 'Order cancellation processed' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
