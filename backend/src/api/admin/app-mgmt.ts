import express from 'express';
import { 
  getApps, 
  createApp, 
  updateApp, 
  deleteApp, 
  getAppCredentials, 
  rotateAppCredentials,
  getAppConfigSchema
} from '../../controllers/appsController.ts';
import { requireAdmin } from '../../middleware/auth.ts';
import { requirePermission } from '../../middleware/rbac.ts';

const router = express.Router();

router.use(requireAdmin);

// Schema (Public to admin)
/**
 * @openapi
 * /api/admin/apps/config-schema:
 *   get:
 *     tags: [Admin - App Management]
 *     summary: Get application configuration schema
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Config schema
 */
router.get('/config-schema', getAppConfigSchema);

// CRUD
// System level management requires 'system.manage' permission
// which is strictly limited to super_admin in the DB seed.

/**
 * @openapi
 * /api/admin/apps:
 *   get:
 *     tags: [Admin - App Management]
 *     summary: List all applications
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of apps
 */
router.get('/', requirePermission('system.manage'), getApps);

/**
 * @openapi
 * /api/admin/apps:
 *   post:
 *     tags: [Admin - App Management]
 *     summary: Create a new application
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Created app
 */
router.post('/', requirePermission('system.manage'), createApp);

/**
 * @openapi
 * /api/admin/apps/{id}:
 *   put:
 *     tags: [Admin - App Management]
 *     summary: Update an application
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *         description: Updated app
 */
router.put('/:id', requirePermission('system.manage'), updateApp);

/**
 * @openapi
 * /api/admin/apps/{id}:
 *   delete:
 *     tags: [Admin - App Management]
 *     summary: Delete an application
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
 *         description: Success
 */
router.delete('/:id', requirePermission('system.manage'), deleteApp);

// Credentials Management
/**
 * @openapi
 * /api/admin/apps/{id}/credentials:
 *   get:
 *     tags: [Admin - App Management]
 *     summary: Get application credentials
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
 *         description: App credentials
 */
router.get('/:id/credentials', requirePermission('system.manage'), getAppCredentials);

/**
 * @openapi
 * /api/admin/apps/{id}/rotate-credentials:
 *   post:
 *     tags: [Admin - App Management]
 *     summary: Rotate application credentials
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
 *         description: New credentials
 */
router.post('/:id/rotate-credentials', requirePermission('system.manage'), rotateAppCredentials);

export default router;
