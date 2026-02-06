import express from 'express';
import { 
  getAgents, 
  createAgent, 
  updateAgent, 
  toggleAgentStatus, 
  deleteAgent,
  reorderAgents,
  getAgentPrompts,
  upsertAgentPrompts,
  deleteAgentPrompt
} from '../../controllers/agentsController.ts';
import { requireAdmin } from '../../middleware/auth.ts';

const router = express.Router();

router.use(requireAdmin);

/**
 * @openapi
 * /api/admin/agents/reorder:
 *   post:
 *     tags: [Admin - Agents]
 *     summary: Reorder AI agents
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/reorder', reorderAgents);

/**
 * @openapi
 * /api/admin/agents:
 *   get:
 *     tags: [Admin - Agents]
 *     summary: List all AI agents
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of agents
 */
router.get('/', getAgents);

/**
 * @openapi
 * /api/admin/agents:
 *   post:
 *     tags: [Admin - Agents]
 *     summary: Create a new AI agent
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
 *         description: Created agent
 */
router.post('/', createAgent);

/**
 * @openapi
 * /api/admin/agents/{id}:
 *   put:
 *     tags: [Admin - Agents]
 *     summary: Update an AI agent
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
 *         description: Updated agent
 */
router.put('/:id', updateAgent);

/**
 * @openapi
 * /api/admin/agents/{id}/status:
 *   patch:
 *     tags: [Admin - Agents]
 *     summary: Toggle agent status
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
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', toggleAgentStatus);

/**
 * @openapi
 * /api/admin/agents/{id}:
 *   delete:
 *     tags: [Admin - Agents]
 *     summary: Delete an AI agent
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
router.delete('/:id', deleteAgent);

// Prompts
/**
 * @openapi
 * /api/admin/agents/{id}/prompts:
 *   get:
 *     tags: [Admin - Agents]
 *     summary: Get agent prompts
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
 *         description: List of prompts
 */
router.get('/:id/prompts', getAgentPrompts);

/**
 * @openapi
 * /api/admin/agents/{id}/prompts:
 *   post:
 *     tags: [Admin - Agents]
 *     summary: Upsert agent prompts
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
 *         description: Updated prompts
 */
router.post('/:id/prompts', upsertAgentPrompts);

/**
 * @openapi
 * /api/admin/agents/{id}/prompts/{promptId}:
 *   delete:
 *     tags: [Admin - Agents]
 *     summary: Delete an agent prompt
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: promptId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.delete('/:id/prompts/:promptId', deleteAgentPrompt);

export default router;
