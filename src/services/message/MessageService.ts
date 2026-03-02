
import { supabase } from '../../lib/supabase';
import type { IMessageAdapter, MessageResult, SendMessageOptions } from './interfaces';
import { EmailAdapter } from './adapters/EmailAdapter';
import { SMSAdapter } from './adapters/SMSAdapter';
import { EncryptionService } from '../EncryptionService';
import { WebhookService } from '../WebhookService';

export type MessageChannel = 'email' | 'sms' | 'whatsapp' | 'wechat' | 'feishu' | 'lark';

export class MessageService {

    /**
     * Factory to get adapter for a specific channel
     */
    private static async getAdapter(channel: MessageChannel): Promise<IMessageAdapter> {
        // Fetch config from DB
        const { data, error } = await supabase
            .from('integration_configs')
            .select('config')
            .eq('category', channel)
            .eq('is_enabled', true)
            .single();

        // Fallback for DEV mode (Email/SMS) if no config found
        // But for production we should strictly require config
        if (error || !data) {
             if (channel === 'sms' || channel === 'email') {
                 console.warn(`[MessageService] No config for ${channel}, using Mock/Dev mode`);
                 const adapter = channel === 'email' ? new EmailAdapter() : new SMSAdapter();
                 // Initialize with empty config -> Adapters should handle this (e.g. throw or mock)
                 // EmailAdapter throws if empty. So we need to handle "Dev Mode" differently or let it fail.
                 // Let's assume for now we throw if not configured, unless it's SMS which is Mock.
                 if (channel === 'sms') return new SMSAdapter();
             }
             throw new Error(`Channel ${channel} not configured or disabled`);
        }

        let config = data.config;

        // Decrypt sensitive fields
        const sensitiveKeys = ['pass', 'password', 'secret', 'token', 'apiKey', 'secretKey'];
        for (const key of sensitiveKeys) {
             if (config[key] && typeof config[key] === 'string' && config[key].includes(':')) {
                 try {
                     config[key] = EncryptionService.decrypt(config[key]);
                 } catch (e) { /* ignore legacy plain text */ }
             }
        }

        let adapter: IMessageAdapter;
        switch (channel) {
            case 'email':
                adapter = new EmailAdapter();
                break;
            case 'sms':
                adapter = new SMSAdapter();
                break;
            // case 'whatsapp': adapter = new WhatsAppAdapter(); break;
            // case 'wechat': adapter = new WeChatAdapter(); break;
            default:
                throw new Error(`Channel ${channel} not implemented yet`);
        }

        adapter.initialize(config);
        return adapter;
    }

    /**
     * Send a unified message
     */
    static async sendMessage(channel: MessageChannel, options: SendMessageOptions, appId?: string): Promise<MessageResult> {
        try {
            const adapter = await this.getAdapter(channel);
            const result = await adapter.sendMessage(options);
            
            // Log success (Audit or System Log)
            console.log(`[MessageService] Sent ${channel} to ${options.recipient}: ${result.success}`);
            
            // Dispatch Webhook if failed (or success if needed)
            if (!result.success && appId) {
                 await WebhookService.dispatch(appId, 'MESSAGE.FAILED', {
                     channel,
                     recipient: options.recipient,
                     error: result.error,
                     timestamp: new Date().toISOString()
                 });
            }

            return result;
        } catch (error: any) {
            console.error(`[MessageService] Failed to send ${channel}:`, error);
            
            // Dispatch Webhook if Critical Failure
            if (appId) {
                await WebhookService.dispatch(appId, 'MESSAGE.FAILED', {
                    channel,
                    recipient: options.recipient,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }

            return {
                success: false,
                provider: channel,
                error: error.message
            };
        }
    }

    /**
     * Send a message using a template
     */
    static async sendTemplateMessage(
        channel: MessageChannel, 
        templateCode: string, 
        data: Record<string, any>, 
        options: Omit<SendMessageOptions, 'content'>,
        appId?: string
    ): Promise<MessageResult> {
        try {
            // 1. Fetch Template
            // Try to find channel-specific template first, then 'all'
            const { data: templates, error } = await supabase
                .from('message_templates')
                .select('*')
                .eq('code', templateCode)
                .eq('is_active', true)
                .in('channel', [channel, 'all']);

            if (error) throw error;
            if (!templates || templates.length === 0) {
                throw new Error(`Template ${templateCode} not found for channel ${channel}`);
            }

            // Prioritize specific channel template
            const template = templates.find(t => t.channel === channel) || templates.find(t => t.channel === 'all');
            
            if (!template) {
                throw new Error(`Template ${templateCode} not found`);
            }

            // 2. Render Content
            let content = template.content;
            // Simple regex replacement for {key}
            for (const [key, value] of Object.entries(data)) {
                content = content.replace(new RegExp(`{${key}}`, 'g'), String(value));
            }
            
            // Render Title if exists (for Email)
            let subject = options.subject;
            if (!subject && template.title) {
                let titleTemplate = template.title;
                for (const [key, value] of Object.entries(data)) {
                    titleTemplate = titleTemplate.replace(new RegExp(`{${key}}`, 'g'), String(value));
                }
                subject = titleTemplate;
            }

            // 3. Send
            return this.sendMessage(channel, {
                ...options,
                content,
                subject
            }, appId);
        } catch (error: any) {
             console.error(`[MessageService] Template Error:`, error);
             return {
                success: false,
                provider: channel,
                error: `Template Error: ${error.message}`
            };
        }
    }
}
