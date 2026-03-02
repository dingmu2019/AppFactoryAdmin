import { EmailService } from '../../emailService';
import type { ProviderSendInput, ProviderSendResult } from '../types';

export class SmtpProvider {
  async send(input: ProviderSendInput): Promise<ProviderSendResult> {
    try {
      const subject = input.subject || '[AdminSys] Notification';
      await EmailService.sendEmail(input.to, subject, input.body);
      return { success: true, response: { mode: 'smtp' } };
    } catch (err: any) {
      return { success: false, errorMessage: err?.message || 'SMTP send failed' };
    }
  }
}

