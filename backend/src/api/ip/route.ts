import express from 'express';

const router = express.Router();

/**
 * @openapi
 * /api/ip:
 *   get:
 *     tags: [Utility]
 *     summary: Get client IP
 *     responses:
 *       200:
 *         description: IP address
 */
router.get('/', (req, res) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  
  const ip = forwardedFor 
    ? (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0].trim()) 
    : (realIp as string) || req.socket.remoteAddress || 'unknown';
  
  return res.json({ ip });
});

export default router;
