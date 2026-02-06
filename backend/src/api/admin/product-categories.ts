
import express from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../../controllers/productCategoriesController.ts';
import { requireAdmin } from '../../middleware/auth.ts';

const router = express.Router();

router.use(requireAdmin);

/**
 * @openapi
 * /api/admin/product-categories:
 *   get:
 *     tags: [Admin - Product Categories]
 *     summary: List product categories
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/', getCategories);

/**
 * @openapi
 * /api/admin/product-categories:
 *   post:
 *     tags: [Admin - Product Categories]
 *     summary: Create a category
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
 *         description: Created category
 */
router.post('/', createCategory);

/**
 * @openapi
 * /api/admin/product-categories/{id}:
 *   put:
 *     tags: [Admin - Product Categories]
 *     summary: Update a category
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
 *         description: Updated category
 */
router.put('/:id', updateCategory);

/**
 * @openapi
 * /api/admin/product-categories/{id}:
 *   delete:
 *     tags: [Admin - Product Categories]
 *     summary: Delete a category
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
router.delete('/:id', deleteCategory);

export default router;
