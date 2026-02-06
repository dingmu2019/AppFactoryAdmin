import dotenv from 'dotenv';
import { SystemLogger } from './lib/logger.ts';
import app from './app.ts';
import { initScheduler } from './services/schedulerService.ts';
import { JobQueue } from './services/jobQueue.ts';
import { OrderService } from './services/OrderService.ts';
import { WebhookService } from './services/WebhookService.ts';
import { MessageService } from './services/message/MessageService.ts';
import { ApiSyncService } from './services/apiSyncService.ts';
import { FulfillmentService } from './services/FulfillmentService.ts';

dotenv.config();

// --- PROCESS LEVEL ERROR HANDLING ---
process.on('uncaughtException', async (error) => {
  console.error('FATAL: Uncaught Exception:', error);
  await SystemLogger.logError({
    level: 'FATAL',
    message: `Uncaught Exception: ${error.message}`,
    stack_trace: error.stack,
    context: { type: 'uncaughtException' }
  });
  // Give some time for log to write before exit, but don't hang indefinitely
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', async (reason: any, promise) => {
  console.error('FATAL: Unhandled Rejection at:', promise, 'reason:', reason);
  await SystemLogger.logError({
    level: 'FATAL',
    message: `Unhandled Rejection: ${reason?.message || String(reason)}`,
    stack_trace: reason?.stack,
    context: { type: 'unhandledRejection', promise: String(promise) }
  });
});
// ------------------------------------

const PORT = process.env.PORT || 3001;

// Only run these background services if NOT in Vercel/Serverless environment
// Vercel Serverless functions freeze after response, so background jobs won't run reliably.
if (!process.env.VERCEL) {
  // Initialize Scheduler
  initScheduler();

  // Initialize Job Queue (pg-boss)
  JobQueue.init().then(async (enabled) => {
      if (!enabled) return;
      // Register Workers
      
      // 1. Auto Cancel Order
      await JobQueue.work('cancel-unpaid-order', async (job) => {
          const { orderId } = job.data;
          console.log(`[Job] Processing auto-cancel for order ${orderId}`);
          await OrderService.cancelOrder(orderId, 'auto-timeout');
      });

      // 2. Webhook Dispatch
      await JobQueue.work('webhook-dispatch', async (job) => {
          console.log(`[Job] Dispatching webhook event ${job.data.eventType}`);
          await WebhookService.processJob(job);
      });

      // 3. System Alert Notify
      await JobQueue.work('system-alert-notify', async (job) => {
          const { logId, level, category, message, timestamp } = job.data;
          console.log(`[Alert] Processing ${level} alert: ${message}`);
          
          // Notify Admin via Email
          // Hardcoded admin email for now, ideally fetch from config
          const adminEmail = process.env.ADMIN_EMAIL;
          if (adminEmail) {
              await MessageService.sendMessage('email', {
                  recipient: adminEmail,
                  subject: `[AdminSys Alert] ${level.toUpperCase()}: ${category} Error`,
                  content: `
                      <h2>System Alert</h2>
                      <p><strong>Level:</strong> ${level}</p>
                      <p><strong>Category:</strong> ${category}</p>
                      <p><strong>Time:</strong> ${timestamp}</p>
                      <p><strong>Message:</strong></p>
                      <pre>${message}</pre>
                      <p><a href="${process.env.DASHBOARD_URL}/admin/errors/${logId}">View Log</a></p>
                  `
              });
          }
      });

      // 4. Order Fulfillment
      await JobQueue.work('fulfill-order', async (job) => {
          const { orderId } = job.data;
          console.log(`[Job] Fulfilling order ${orderId}`);
          await FulfillmentService.fulfillOrder(orderId);
      });
  });

  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    
    // Auto-sync API Catalog on startup
    ApiSyncService.sync().catch(err => {
        console.error('Failed to auto-sync API Catalog:', err);
    });
  });
}

// Export app for Vercel Serverless
export default app;
