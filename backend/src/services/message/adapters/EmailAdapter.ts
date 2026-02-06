
import nodemailer from 'nodemailer';
import type { IMessageAdapter, MessageResult, SendMessageOptions } from '../interfaces.ts';

export class EmailAdapter implements IMessageAdapter {
  private transporter: nodemailer.Transporter | null = null;
  private sender: string = '';

  initialize(config: any): void {
    if (!config.host || !config.user || !config.pass) {
      // In prod, throw error. For now, we allow null config for DEV mode fallback if handled by service
      // But adapter should strictly enforce config if it's supposed to work.
      throw new Error('Email configuration incomplete');
    }

    this.sender = `"${config.senderName || 'AdminSys'}" <${config.user}>`;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port || 587,
      secure: config.secure || false,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  async sendMessage(options: SendMessageOptions): Promise<MessageResult> {
    if (!this.transporter) {
       return {
         success: false,
         provider: 'email',
         error: 'Email adapter not initialized'
       };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.sender,
        to: options.recipient,
        subject: options.subject || 'No Subject',
        html: options.content, // Assume content is HTML
        // text: options.content // We could strip tags for text fallback
      });

      return {
        success: true,
        provider: 'email',
        messageId: info.messageId,
        rawResponse: info
      };
    } catch (error: any) {
      console.error('EmailAdapter Send Error:', error);
      return {
        success: false,
        provider: 'email',
        error: error.message
      };
    }
  }
}
