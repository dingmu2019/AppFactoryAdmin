import express from 'express';
import * as oauthController from '../../controllers/oauthController.ts';

const router = express.Router();

/**
 * @openapi
 * /api/oauth/authorize:
 *   get:
 *     tags: [OAuth]
 *     summary: OAuth2 Authorization Endpoint
 *     parameters:
 *       - in: query
 *         name: response_type
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: client_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: redirect_uri
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Authorization page or redirect
 */
router.get('/authorize', oauthController.authorize);

/**
 * @openapi
 * /api/oauth/token:
 *   post:
 *     tags: [OAuth]
 *     summary: OAuth2 Token Endpoint
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [grant_type, code, client_id]
 *             properties:
 *               grant_type:
 *                 type: string
 *               code:
 *                 type: string
 *               client_id:
 *                 type: string
 *               client_secret:
 *                 type: string
 *               redirect_uri:
 *                 type: string
 *     responses:
 *       200:
 *         description: Access token
 */
router.post('/token', oauthController.token);

/**
 * @openapi
 * /api/oauth/userinfo:
 *   get:
 *     tags: [OAuth]
 *     summary: OAuth2 UserInfo Endpoint
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User information
 */
router.get('/userinfo', oauthController.userinfo);

export default router;
