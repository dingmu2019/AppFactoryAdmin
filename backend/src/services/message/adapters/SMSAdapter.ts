
import type { IMessageAdapter, MessageResult, SendMessageOptions } from '../interfaces.ts';
import Dysmsapi20170525, * as $Dysmsapi20170525 from '@alicloud/dysmsapi20170525';
import OpenApi, * as $OpenApi from '@alicloud/openapi-client';
import Util, * as $Util from '@alicloud/tea-util';

/**
 * AliCloud SMS Adapter
 */
export class SMSAdapter implements IMessageAdapter {
  private client: any = null;
  private config: any = null;

  initialize(config: any): void {
    this.config = config;
    if (config.accessKeyId && config.accessKeySecret) {
        const conf = new $OpenApi.Config({
            accessKeyId: config.accessKeyId,
            accessKeySecret: config.accessKeySecret,
        });
        conf.endpoint = config.endpoint || 'dysmsapi.aliyuncs.com';
        // @ts-ignore
        this.client = new Dysmsapi20170525.default(conf);
    }
  }

  async sendMessage(options: SendMessageOptions): Promise<MessageResult> {
    // If no client configured, fallback to Mock log
    if (!this.client) {
        console.log('=================================================');
        console.log(`[SMS MOCK] To: ${options.recipient}`);
        console.log(`[SMS MOCK] Body: ${options.content}`);
        console.log('=================================================');
        return {
            success: true,
            provider: 'sms-mock',
            messageId: `mock-${Date.now()}`
        };
    }

    try {
        const sendSmsRequest = new $Dysmsapi20170525.SendSmsRequest({
            phoneNumbers: options.recipient,
            signName: this.config.signName,
            templateCode: options.subject, // Using subject as TemplateCode for SMS
            templateParam: options.content // Expecting JSON string for params
        });

        const runtime = new $Util.RuntimeOptions({});
        const resp = await this.client.sendSmsWithOptions(sendSmsRequest, runtime);
        
        if (resp.body.code === 'OK') {
            return {
                success: true,
                provider: 'aliyun-sms',
                messageId: resp.body.bizId || resp.body.requestId,
                rawResponse: resp.body
            };
        } else {
             return {
                success: false,
                provider: 'aliyun-sms',
                error: `${resp.body.code}: ${resp.body.message}`,
                rawResponse: resp.body
            };
        }

    } catch (error: any) {
        return {
            success: false,
            provider: 'aliyun-sms',
            error: error.message
        };
    }
  }
}
