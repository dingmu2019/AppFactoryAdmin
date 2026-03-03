
import type { IMessageAdapter, MessageResult, SendMessageOptions } from '../interfaces';
import type { FeishuConfig, LarkConfig } from '../../../types/integration';

/**
 * Feishu (Lark) Message Adapter
 */
export class FeishuAdapter implements IMessageAdapter {
  private config?: FeishuConfig | LarkConfig;
  private accessToken?: string;
  private tokenExpiresAt?: number;
  private providerName: string = 'feishu';

  initialize(config: FeishuConfig | LarkConfig): void {
    this.config = config;
    // Determine provider name from config or context if needed
  }

  setProvider(name: 'feishu' | 'lark') {
    this.providerName = name;
  }

  private async getAccessToken(): Promise<string> {
    if (!this.config) throw new Error(`${this.providerName} config not initialized`);
    
    // Check cache
    if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const { appId, appSecret } = this.config;
    const baseUrl = this.providerName === 'lark' ? 'https://open.larksuite.com' : 'https://open.feishu.cn';
    const url = `${baseUrl}/open-apis/auth/v3/tenant_access_token/internal`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret })
    });
    
    const data = await response.json();

    if (data.code !== 0) {
      throw new Error(`Failed to get ${this.providerName} tenant_access_token: ${data.msg}`);
    }

    this.accessToken = data.tenant_access_token;
    // Buffer of 5 minutes (300 seconds)
    this.tokenExpiresAt = Date.now() + (data.expire - 300) * 1000;
    
    return this.accessToken!;
  }

  async sendMessage(options: SendMessageOptions): Promise<MessageResult> {
    if (!this.config) throw new Error(`${this.providerName} config not initialized`);

    try {
      const token = await this.getAccessToken();
      const baseUrl = this.providerName === 'lark' ? 'https://open.larksuite.com' : 'https://open.feishu.cn';
      
      // Determine receive_id_type
      let receiveIdType = 'open_id';
      if (options.recipient.includes('@')) {
        receiveIdType = 'email';
      } else if (options.recipient.startsWith('oc_')) {
        receiveIdType = 'chat_id';
      } else if (options.recipient.startsWith('ou_')) {
        receiveIdType = 'open_id';
      }

      const url = `${baseUrl}/open-apis/im/v1/messages?receive_id_type=${receiveIdType}`;

      const payload: any = {
        receive_id: options.recipient,
        msg_type: 'text',
        content: JSON.stringify({
          text: options.content
        })
      };

      // If content looks like it has formatting, maybe use post type (interactive)
      // But for simplicity, we use text first.

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.code !== 0) {
        return {
          success: false,
          provider: this.providerName,
          error: data.msg,
          rawResponse: data
        };
      }

      return {
        success: true,
        messageId: data.data?.message_id,
        provider: this.providerName,
        rawResponse: data
      };
    } catch (error: any) {
      return {
        success: false,
        provider: this.providerName,
        error: error.message
      };
    }
  }
}
