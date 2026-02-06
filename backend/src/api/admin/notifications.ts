import express from 'express';
import { requireAdmin } from '../../middleware/auth.ts';
import {
  getNotificationOverview,
  sendNotificationTest,
  upsertNotificationChannel
} from '../../controllers/notificationController.ts';

const router = express.Router();

router.use(requireAdmin);

/**
 * @openapi
 * /api/admin/notifications:
 *   get:
 *     tags: [Admin - Notifications]
 *     summary: Get notification overview
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Notification stats
 */
router.get('/', getNotificationOverview);

/**
 * @openapi
 * /api/admin/notifications/channels/{channelType}:
 *   post:
 *     tags: [Admin - Notifications]
 *     summary: Upsert notification channel
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelType
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
 *         description: Updated channel
 */
router.post('/channels/:channelType', upsertNotificationChannel);

/**
 * @openapi
 * /api/admin/notifications/test:
 *   post:
 *     tags: [Admin - Notifications]
 *     summary: Test notification sending
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
router.post('/test', sendNotificationTest);

export default router;

