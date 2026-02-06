import express from 'express';
import { getSystemLogs, resolveLog, getSystemLogStats } from '../../controllers/systemLogsController.ts';
import { requireAdmin } from '../../middleware/auth.ts';
import { requirePermission } from '../../middleware/rbac.ts';

const router = express.Router();

router.use(requireAdmin);

/**
 * @openapi
 * /api/admin/system-logs:
 *   get:
 *     tags: [Admin - System Logs]
 *     summary: List system logs
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of logs
 */
router.get('/', requirePermission('system.manage'), getSystemLogs);

/**
 * @openapi
 * /api/admin/system-logs/stats:
 *   get:
 *     tags: [Admin - System Logs]
 *     summary: Get log statistics
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Log stats
 */
router.get('/stats', requirePermission('system.manage'), getSystemLogStats);

/**
 * @openapi
 * /api/admin/system-logs/{id}/resolve:
 *   patch:
 *     tags: [Admin - System Logs]
 *     summary: Mark log as resolved
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
 *         description: Log resolved
 */
router.patch('/:id/resolve', requirePermission('system.manage'), resolveLog);

export default router;
