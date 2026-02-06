import express from 'express';
import { listApis, getApiDetail, syncApis } from '../../controllers/apiMgmtController.ts';
import { requireAdmin } from '../../middleware/auth.ts';
import { requirePermission } from '../../middleware/rbac.ts';

const router = express.Router();

router.use(requireAdmin);

/**
 * @openapi
 * /api/admin/apis/sync:
 *   post:
 *     tags: [Admin - API Management]
 *     summary: Manually trigger API Catalog synchronization
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Synchronization result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 */
router.post('/sync', requirePermission('system.manage'), syncApis);

/**
 * @openapi
 * /api/admin/apis:
 *   get:
 *     tags: [Admin - API Management]
 *     summary: List all API definitions
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of APIs
 */
router.get('/', requirePermission('system.manage'), listApis);

/**
 * @openapi
 * /api/admin/apis/{id}:
 *   get:
 *     tags: [Admin - API Management]
 *     summary: Get API definition details
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
 *         description: API details
 */
router.get('/:id', requirePermission('system.manage'), getApiDetail);

export default router;
