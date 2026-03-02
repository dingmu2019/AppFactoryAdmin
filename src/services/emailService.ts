import nodemailer from 'nodemailer';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { EncryptionService } from './EncryptionService';
import { SystemLogger } from '../lib/logger';
import { QueueService } from '../lib/queue';

interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  senderName: string;
  secure: boolean;
}

export class EmailService {
  private static createTransporter(config: EmailConfig, debug = false) {
    // ... (existing code)
    const isSecure = config.port === 465;

    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: isSecure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      tls: {
        rejectUnauthorized: false,
        servername: config.host,
        minVersion: 'TLSv1',
        ciphers: 'DEFAULT@SECLEVEL=0'
      },
      connectionTimeout: 20000,
      greetingTimeout: 20000,
      socketTimeout: 30000,
      debug: debug,
      logger: debug
    });
  }

  private static async getConfig(): Promise<EmailConfig | null> {
    const { data, error } = await supabase
      .from('integration_configs')
      .select('config')
      .eq('category', 'email')
      .eq('is_enabled', true)
      .single();

    if (error || !data) {
      console.warn('Email configuration not found or disabled.');
      return null;
    }

    const config = data.config as EmailConfig;
    
    // Decrypt password if encrypted
    if (config.pass && config.pass.includes(':')) {
      try {
        config.pass = EncryptionService.decrypt(config.pass);
      } catch (err: any) {
        console.error('Failed to decrypt email password:', err);
        // We still return config, but SMTP will likely fail.
        // It's better than returning null which triggers DEV mode fallback silently.
      }
    }

    return config;
  }

  /**
   * Send verification code (Async supported)
   * @param to Recipient email
   * @param code Verification code
   * @param isWorker Set to true if this call is coming from the queue worker (to bypass queue logic)
   */
  static async sendVerificationCode(to: string, code: string, isWorker = false) {
    // 1. Try async queue if enabled and not already in worker context
    if (!isWorker && process.env.ENABLE_ASYNC_EMAIL === 'true') {
      const published = await QueueService.publish('verification', { to, code });
      if (published) {
        console.log(`[Email] Queued verification code for ${to}`);
        return;
      }
      console.warn(`[Email] Failed to queue (or not configured), falling back to sync send.`);
    }

    const config = await this.getConfig();

    if (!config) {
      const msg = `[DEV MODE] Verification Code for ${to}: ${code}`;
      console.log('=================================================');
      console.log(msg);
      console.log('=================================================');
      return;
    }

    try {
      const transporter = this.createTransporter(config);
      // ... (rest of logic)
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #333; text-align: center;">Login Verification Code / 登录验证码</h2>
          <p style="color: #666; font-size: 16px;">Hello,</p>
          <p style="color: #666; font-size: 16px;">You are logging in to <strong>AdminSys</strong>. Please use the following verification code to complete the process.</p>
          <p style="color: #666; font-size: 16px;">您正在登录 <strong>AdminSys</strong> 系统。请使用以下验证码完成登录。</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4F46E5; font-family: 'Courier New', monospace;">${code}</span>
          </div>
          
          <p style="color: #999; font-size: 14px;">The code is valid for 5 minutes. If you did not request this, please ignore this email.</p>
          <p style="color: #999; font-size: 14px;">验证码有效期为 5 分钟。如果您没有请求此验证码，请忽略此邮件。</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="text-align: center; color: #bbb; font-size: 12px;">&copy; ${new Date().getFullYear()} AdminSys. All rights reserved.</p>
        </div>
      `;

      await transporter.sendMail({
        from: `"${config.senderName}" <${config.user}>`,
        to,
        subject: `[AdminSys] Login Verification Code: ${code}`,
        html,
      });
    } catch (err: any) {
       // ... (error handling)
       console.error('Email verification code send failed:', {
        message: err.message,
        code: err.code,
        command: err.command,
        response: err.response,
        responseCode: err.responseCode,
        stack: err.stack
      });
      await SystemLogger.logError({
        level: 'ERROR',
        message: `Email verification code send failed: ${err.message}`,
        stack_trace: err.stack,
        context: { 
          to, 
          host: config.host, 
          user: config.user,
          errorCode: err.code,
          response: err.response 
        }
      });
      throw err;
    }
  }

  static async sendEmail(to: string, subject: string, html: string, isWorker = false) {
    // 1. Try async queue if enabled and not already in worker context
    if (!isWorker && process.env.ENABLE_ASYNC_EMAIL === 'true') {
      const published = await QueueService.publish('email', { to, subject, html });
      if (published) {
        console.log(`[Email] Queued email to ${to}`);
        return;
      }
      console.warn(`[Email] Failed to queue (or not configured), falling back to sync send.`);
    }

    const config = await this.getConfig();

    if (!config) {
        console.log('=================================================');
        console.log(`[DEV MODE] Email to ${to}`);
        console.log(`Subject: ${subject}`);
        console.log('=================================================');
        return;
    }

    try {
        const transporter = this.createTransporter(config);

        await transporter.sendMail({
          from: `"${config.senderName}" <${config.user}>`,
          to,
          subject,
          html,
        });
    } catch (err: any) {
        await SystemLogger.logError({
            level: 'ERROR',
            message: `Email send failed: ${err.message}`,
            stack_trace: err.stack,
            context: { to, subject }
        });
        throw err;
    }
  }


  static async sendTestEmail(to?: string, customConfig?: EmailConfig) {
    const config = customConfig || await this.getConfig();

    if (!config) {
      return {
        mode: 'dev' as const,
        success: false,
        message: 'Email configuration is missing or disabled.'
      };
    }

    try {
      const transporter = this.createTransporter(config, true);

      // 3. Verify connection first
      await transporter.verify();

      // 4. Send email if recipient exists
      if (!to) {
        return {
          mode: 'smtp' as const,
          success: true,
          message: 'SMTP connection verified successfully.'
        };
      }

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #111827;">AdminSys Email Test / 邮件测试</h2>
          <p style="color: #374151;">If you received this email, SMTP configuration works.</p>
          <p style="color: #374151;">如果您收到此邮件，说明 SMTP 配置可用。</p>
          <p style="color: #9CA3AF; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `;

      // 5. Send mail
      const info = await transporter.sendMail({
        from: `"${config.senderName || 'AdminSys'}" <${config.user}>`,
        to,
        subject: '[AdminSys] Email Test / 邮件测试',
        html
      });

      // 6. Check if accepted
      if (info.rejected.length > 0) {
        throw new Error(`Email rejected by server: ${info.rejected.join(', ')}`);
      }

      return {
        mode: 'smtp' as const,
        success: true,
        accepted: info.accepted,
        rejected: info.rejected,
        messageId: info.messageId,
        message: 'SMTP verified and test email sent. MessageID: ' + info.messageId
      };
    } catch (err: any) {
      let extraMessage = '';
      if (err.code === 'ECONNRESET' || err.message.includes('Connection closed') || err.message.includes('socket disconnected')) {
        extraMessage = ' (Check if port/secure setting matches. 465 usually needs SSL/secure: true, 587 needs STARTTLS/secure: false)';
      } else if (err.message.includes('Greeting never received')) {
        extraMessage = ' (Server established connection but timed out waiting for greeting. This usually happens if the "secure" flag is wrong for the port, or the server is slow. Try 465 with secure:true or 587 with secure:false)';
      }

      return {
        mode: 'smtp' as const,
        success: false,
        message: (err?.message || 'SMTP verification or send failed') + extraMessage
      };
    }
  }
}

