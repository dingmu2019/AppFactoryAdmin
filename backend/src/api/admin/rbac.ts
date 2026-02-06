import express from 'express';
import * as rbacController from '../../controllers/rbacController.ts';
import { requireAdmin } from '../../middleware/auth.ts';

const router = express.Router();

router.use(requireAdmin);

// Roles
/**
 * @openapi
 * /api/admin/rbac/roles:
 *   get:
 *     tags: [Admin - RBAC]
 *     summary: List roles
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles
 */
router.get('/roles', rbacController.getRoles);

/**
 * @openapi
 * /api/admin/rbac/roles:
 *   post:
 *     tags: [Admin - RBAC]
 *     summary: Create a new role
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
 *         description: Created role
 */
router.post('/roles', rbacController.createRole);

/**
 * @openapi
 * /api/admin/rbac/roles/{id}:
 *   delete:
 *     tags: [Admin - RBAC]
 *     summary: Delete a role
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
router.delete('/roles/:id', rbacController.deleteRole);

// Permissions
/**
 * @openapi
 * /api/admin/rbac/permissions:
 *   get:
 *     tags: [Admin - RBAC]
 *     summary: List permissions
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of permissions
 */
router.get('/permissions', rbacController.getPermissions);

/**
 * @openapi
 * /api/admin/rbac/permissions:
 *   post:
 *     tags: [Admin - RBAC]
 *     summary: Create a permission
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
 *         description: Created permission
 */
router.post('/permissions', rbacController.createPermission);

// Policies
/**
 * @openapi
 * /api/admin/rbac/policies:
 *   get:
 *     tags: [Admin - RBAC]
 *     summary: List policies
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of policies
 */
router.get('/policies', rbacController.getPolicies);

/**
 * @openapi
 * /api/admin/rbac/policies:
 *   post:
 *     tags: [Admin - RBAC]
 *     summary: Create a policy
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
 *         description: Created policy
 */
router.post('/policies', rbacController.createPolicy);

// Assignments
/**
 * @openapi
 * /api/admin/rbac/users/assign:
 *   post:
 *     tags: [Admin - RBAC]
 *     summary: Assign role to user
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
 *         description: Success
 */
router.post('/users/assign', rbacController.assignRoleToUser);

/**
 * @openapi
 * /api/admin/rbac/users/remove:
 *   post:
 *     tags: [Admin - RBAC]
 *     summary: Remove role from user
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
 *         description: Success
 */
router.post('/users/remove', rbacController.removeRoleFromUser);

export default router;
