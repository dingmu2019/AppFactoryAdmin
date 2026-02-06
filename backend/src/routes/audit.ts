import express from 'express';
import { AuditLogService } from '../services/auditService.ts';
import { extractUser } from '../middleware/audit.ts';

const router = express.Router();

// Apply user extraction to all audit routes
router.use(extractUser);

// Get audit logs
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const app_id = req.query.app_id as string;
    const action = req.query.action as string;
    const resource = req.query.resource as string;
    // const user_email = req.query.user_email as string; // Removed
    const user_id = req.query.user_id as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const result = await AuditLogService.query({
      page,
      pageSize,
      app_id,
      action,
      resource,
      // user_email,
      user_id,
      startDate,
      endDate
    });

    res.json(result);
  } catch (error) {
    console.error('Error querying audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await AuditLogService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({ error: 'Failed to fetch audit stats' });
  }
});

// Manual log entry (for frontend specific events like "Viewed Page" or "Exported Data")
router.post('/log', async (req, res) => {
  try {
    const { action, resource, details, status } = req.body;
    
    const appIdCandidate = details?.app_id || req.currentApp?.id;
    const app_id = (await AuditLogService.resolveAppId(appIdCandidate)) || (await AuditLogService.getAdminSysAppId());

    await AuditLogService.log({
      user_id: req.user?.id,
      // user_email: req.user?.email || details?.email || 'Anonymous', // Removed
      action,
      resource,
      app_id, // Pass app_id
      details,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      status: status || 'SUCCESS'
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error writing audit log:', error);
    res.status(500).json({ error: 'Failed to write log' });
  }
});

export default router;
