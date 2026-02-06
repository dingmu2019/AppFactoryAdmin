import express from 'express';
import { requireAdmin } from '../../middleware/auth.ts';
import { getDashboardOverview } from '../../controllers/dashboardController.ts';

const router = express.Router();

router.use(requireAdmin);

/**
 * @openapi
 * /api/admin/dashboard/overview:
 *   get:
 *     tags: [Admin - Dashboard]
 *     summary: Get dashboard overview
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 */
router.get('/overview', getDashboardOverview);

export default router;
