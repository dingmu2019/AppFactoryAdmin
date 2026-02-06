import type { Request, Response } from 'express';
import { NotificationService } from '../services/notification/notificationService.ts';

export const getNotificationOverview = async (_req: Request, res: Response) => {
  try {
    const data = await NotificationService.getOverview();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load notification config' });
  }
};

export const upsertNotificationChannel = async (req: Request, res: Response) => {
  const { channelType } = req.params as any;
  const { channelName, isEnabled, provider, route, template } = req.body || {};

  if (!channelType) {
    res.status(400).json({ error: 'channelType is required' });
    return;
  }
  if (!provider?.providerType || !provider?.name) {
    res.status(400).json({ error: 'provider.providerType and provider.name are required' });
    return;
  }
  if (!route?.messageType) {
    res.status(400).json({ error: 'route.messageType is required' });
    return;
  }

  try {
    const result = await NotificationService.upsertChannelConfig({
      channelType,
      channelName,
      isEnabled: !!isEnabled,
      provider: {
        providerType: provider.providerType,
        name: provider.name,
        isEnabled: provider.isEnabled !== false,
        config: provider.config || {}
      },
      route: {
        messageType: route.messageType,
        priority: route.priority,
        isEnabled: route.isEnabled !== false
      },
      template: template
        ? {
            messageType: template.messageType || route.messageType,
            language: template.language,
            subject: template.subject,
            body: template.body,
            format: template.format,
            isEnabled: template.isEnabled !== false
          }
        : undefined
    });

    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save notification config' });
  }
};

export const sendNotificationTest = async (req: Request, res: Response) => {
  const { channelType, to, messageType, variables } = req.body || {};
  if (!channelType || !to) {
    res.status(400).json({ error: 'channelType and to are required' });
    return;
  }
  try {
    const result = await NotificationService.sendTest(channelType, to, messageType || 'test', variables || {});
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to send test' });
  }
};

