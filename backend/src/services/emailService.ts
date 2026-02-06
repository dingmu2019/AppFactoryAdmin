import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client for fetching config
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  senderName: string;
  secure: boolean;
}

export class EmailService {
  private static async getConfig(): Promise<EmailConfig | null> {
    const { data, error } = await supabase
      .from('integration_configs')
      .select('config')
      .eq('category', 'email')
      .eq('is_enabled', true)
      .single();

    if (error || !data) {
      console.warn('Email configuration not found or disabled. Falling back to console log.');
      return null;
    }

    return data.config as EmailConfig;
  }

  static async sendVerificationCode(to: string, code: string) {
    const config = await this.getConfig();

    if (!config) {
      console.log('=================================================');
      console.log(`[DEV MODE] Verification Code for ${to}: ${code}`);
      console.log('=================================================');
      return;
    }

    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass,
        },
      });

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
    } catch (err) {
      console.warn('Email send failed. Falling back to console log.', err);
      console.log('=================================================');
      console.log(`[DEV MODE] Verification Code for ${to}: ${code}`);
      console.log('=================================================');
    }
  }

  static async sendEmail(to: string, subject: string, html: string) {
    const config = await this.getConfig();

    if (!config) {
        console.log('=================================================');
        console.log(`[DEV MODE] Email to ${to}`);
        console.log(`Subject: ${subject}`);
        console.log('Body:', html);
        console.log('=================================================');
        return;
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    await transporter.sendMail({
      from: `"${config.senderName}" <${config.user}>`,
      to,
      subject,
      html,
    });
  }

  static async sendTestEmail(to: string) {
    const config = await this.getConfig();

    if (!config) {
      return {
        mode: 'dev' as const,
        success: true,
        message: 'Email config missing/disabled; message is only logged to server console.'
      };
    }

    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass
        }
      });

      await transporter.verify();

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #111827;">AdminSys Email Test / 邮件测试</h2>
          <p style="color: #374151;">If you received this email, SMTP configuration works.</p>
          <p style="color: #374151;">如果您收到此邮件，说明 SMTP 配置可用。</p>
          <p style="color: #9CA3AF; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `;

      const info = await transporter.sendMail({
        from: `"${config.senderName}" <${config.user}>`,
        to,
        subject: '[AdminSys] Email Test / 邮件测试',
        html
      });

      return {
        mode: 'smtp' as const,
        success: true,
        accepted: info.accepted,
        rejected: info.rejected,
        messageId: (info as any).messageId
      };
    } catch (err: any) {
      return {
        mode: 'smtp' as const,
        success: false,
        message: err?.message || 'Email test failed'
      };
    }
  }
}
