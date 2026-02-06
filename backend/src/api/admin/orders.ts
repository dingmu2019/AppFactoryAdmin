import express from 'express';
import { getOrders, getRefunds, createRefund, getOrderStats } from '../../controllers/ordersController.ts';
import { requireAdmin } from '../../middleware/auth.ts';
import { requirePermission } from '../../middleware/rbac.ts';

const router = express.Router();

router.use(requireAdmin);

/**
 * @openapi
 * /api/admin/orders/stats:
 *   get:
 *     tags: [Admin - Orders]
 *     summary: Get order statistics
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Order stats
 */
router.get('/stats', requirePermission('order.read'), getOrderStats);

/**
 * @openapi
 * /api/admin/orders:
 *   get:
 *     tags: [Admin - Orders]
 *     summary: List orders
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of orders
 */
router.get('/', requirePermission('order.read'), getOrders);

/**
 * @openapi
 * /api/admin/orders/{orderId}/refunds:
 *   get:
 *     tags: [Admin - Orders]
 *     summary: Get refunds for an order
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of refunds
 */
router.get('/:orderId/refunds', requirePermission('order.read'), getRefunds);

/**
 * @openapi
 * /api/admin/orders/{orderId}/refunds:
 *   post:
 *     tags: [Admin - Orders]
 *     summary: Create a refund
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Created refund
 */
router.post('/:orderId/refunds', requirePermission('order.refund'), createRefund);

export default router;
