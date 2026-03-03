
import type { IMessageAdapter, MessageResult, SendMessageOptions } from '../interfaces';
import type { WeChatConfig } from '../../../types/integration';

/**
 * Enterprise WeChat (WeCom) Message Adapter
 */
export class WeChatAdapter implements IMessageAdapter {
  private config?: WeChatConfig;
  private accessToken?: string;
  private tokenExpiresAt?: number;

  initialize(config: WeChatConfig): void {
    this.config = config;
  }

  private async getAccessToken(): Promise<string> {
    if (!this.config) throw new Error('WeChat config not initialized');
    
    // Check cache
    if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const { corpId, secret } = this.config;
    const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpId}&corpsecret=${secret}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.errcode !== 0) {
      throw new Error(`Failed to get WeChat access token: ${data.errmsg}`);
    }

    this.accessToken = data.access_token;
    // Buffer of 5 minutes (300 seconds)
    this.tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;
    
    return this.accessToken!;
  }

  async sendMessage(options: SendMessageOptions): Promise<MessageResult> {
    if (!this.config) throw new Error('WeChat config not initialized');

    try {
      const token = await this.getAccessToken();
      const url = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${token}`;

      // Default to text message
      const payload: any = {
        touser: options.recipient, // Can be user_id, or @all
        agentid: this.config.agentId,
        msgtype: 'text',
        text: {
          content: options.content
        },
        safe: 0,
        enable_id_trans: 0,
        enable_duplicate_check: 0
      };

      // If content looks like markdown, try markdown type
      if (options.content.includes('#') || options.content.includes('**') || options.content.includes('>')) {
          payload.msgtype = 'markdown';
          payload.markdown = {
              content: options.content
          };
          delete payload.text;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.errcode !== 0) {
        return {
          success: false,
          provider: 'wechat',
          error: data.errmsg,
          rawResponse: data
        };
      }

      return {
        success: true,
        messageId: data.msgid,
        provider: 'wechat',
        rawResponse: data
      };
    } catch (error: any) {
      return {
        success: false,
        provider: 'wechat',
        error: error.message
      };
    }
  }
}
