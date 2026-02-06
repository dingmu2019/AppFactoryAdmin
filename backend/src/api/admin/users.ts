import express from 'express';
import { getUsers, updateUser, deleteUser } from '../../controllers/usersController.ts';
import { requireAdmin } from '../../middleware/auth.ts';

const router = express.Router();

router.use(requireAdmin);

/**
 * @openapi
 * /api/admin/users:
 *   get:
 *     tags: [Admin - User Management]
 *     summary: List all users
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/', getUsers);

/**
 * @openapi
 * /api/admin/users/{id}:
 *   put:
 *     tags: [Admin - User Management]
 *     summary: Update a user
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
 *         description: Updated user
 */
router.put('/:id', updateUser);

/**
 * @openapi
 * /api/admin/users/{id}:
 *   delete:
 *     tags: [Admin - User Management]
 *     summary: Delete a user
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
router.delete('/:id', deleteUser);

export default router;
