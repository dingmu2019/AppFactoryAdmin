import express from 'express';

const router = express.Router();

/**
 * @openapi
 * /api/debug/test-error:
 *   get:
 *     tags: [Debug]
 *     summary: Trigger test error
 *     responses:
 *       500:
 *         description: Error triggered
 */
router.get('/test-error', async (req, res, next) => {
  try {
    throw new Error('This is a test system error triggered manually.');
  } catch (error) {
    next(error); // Pass to globalErrorHandler
  }
});

/**
 * @openapi
 * /api/debug/test-async-error:
 *   get:
 *     tags: [Debug]
 *     summary: Trigger async test error
 *     responses:
 *       500:
 *         description: Error triggered
 */
router.get('/test-async-error', async (req, res) => {
  // Express 5 should catch this automatically without try/catch
  throw new Error('This is an async test error (Express 5 auto-catch).');
});

export default router;
