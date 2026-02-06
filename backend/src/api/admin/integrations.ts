import express from 'express';
import {
  getIntegrationConfigs,
  saveIntegrationConfig,
  deleteIntegrationConfig,
  testEmailSend,
  testLLMConnection
} from '../../controllers/integrationController.ts';
import { requireAdmin } from '../../middleware/auth.ts';

const router = express.Router();

router.use(requireAdmin);

/**
 * @openapi
 * /api/admin/integrations:
 *   get:
 *     tags: [Admin - Integrations]
 *     summary: Get all integration configurations
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of integration configs
 */
router.get('/', getIntegrationConfigs);

/**
 * @openapi
 * /api/admin/integrations:
 *   post:
 *     tags: [Admin - Integrations]
 *     summary: Save or update an integration configuration
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
 *         description: Saved configuration
 */
router.post('/', saveIntegrationConfig);

/**
 * @openapi
 * /api/admin/integrations:
 *   delete:
 *     tags: [Admin - Integrations]
 *     summary: Delete an integration configuration
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.delete('/', deleteIntegrationConfig);

/**
 * @openapi
 * /api/admin/integrations/email/test:
 *   post:
 *     tags: [Admin - Integrations]
 *     summary: Test email sending
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               to:
 *                 type: string
 *     responses:
 *       200:
 *         description: Test result
 */
router.post('/email/test', testEmailSend);

/**
 * @openapi
 * /api/admin/integrations/llm/test:
 *   post:
 *     tags: [Admin - Integrations]
 *     summary: Test LLM connection
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
 *         description: Test result
 */
router.post('/llm/test', testLLMConnection);

export default router;
