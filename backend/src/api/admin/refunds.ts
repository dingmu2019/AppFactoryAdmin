import express from 'express';
import { requireAdmin } from '../../middleware/auth.ts';
import { getRefundList, getRefundStats } from '../../controllers/refundsController.ts';

const router = express.Router();

router.use(requireAdmin);

/**
 * @openapi
 * /api/admin/refunds:
 *   get:
 *     tags: [Admin - Refunds]
 *     summary: List refunds
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of refunds
 */
router.get('/', getRefundList);

/**
 * @openapi
 * /api/admin/refunds/stats:
 *   get:
 *     tags: [Admin - Refunds]
 *     summary: Get refund statistics
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Refund stats
 */
router.get('/stats', getRefundStats);

export default router;
