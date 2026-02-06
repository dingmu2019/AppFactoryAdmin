import cron from 'node-cron';
import { executeSkill } from './skillService.ts';
import { NotificationService } from './notification/notificationService.ts';
import { AiGatewayAlertService } from './aiGatewayAlertService.ts';

let notificationOutboxDisabled = false;

export const initScheduler = () => {
  console.log('[Scheduler] Initializing system scheduler...');

  // Daily Report at 8:00 AM
  // Schedule: 0 8 * * * (At 08:00 AM)
  cron.schedule('0 8 * * *', async () => {
    console.log('[Scheduler] Triggering Daily Report Skill...');
    try {
        await executeSkill('daily_report_skill', {
            email: '517709151@qq.com'
        });
        console.log('[Scheduler] Daily Report executed successfully.');
    } catch (error) {
        console.error('[Scheduler] Failed to execute Daily Report:', error);
    }
  });

  cron.schedule('*/1 * * * *', async () => {
    try {
      if (notificationOutboxDisabled) return;
      await NotificationService.processBatch(20);
    } catch (error) {
      const message = (error as any)?.message || '';
      if (typeof message === 'string' && message.includes('claim_notification_jobs')) {
        notificationOutboxDisabled = true;
        console.warn('[Scheduler] Notification outbox disabled (missing DB function). Apply migration 36_notification_channels.sql to enable.');
        return;
      }
      console.error('[Scheduler] Failed to process notification outbox:', error);
    }
  });

  cron.schedule('*/5 * * * *', async () => {
    try {
      await AiGatewayAlertService.runOnce();
    } catch (error) {
      console.error('[Scheduler] Failed to evaluate AI gateway alerts:', error);
    }
  });
  
  console.log('[Scheduler] Tasks scheduled.');
};
