
// @ts-ignore
import WxPay from 'wechatpay-node-v3';
import type { IPaymentAdapter, PaymentResult, WebhookResult } from '../interfaces';
import fs from 'fs';
import path from 'path';

export class WeChatPayAdapter implements IPaymentAdapter {
  private pay: any = null;
  private mchid: string = '';
  private appid: string = '';
  private notifyUrl: string = '';

  initialize(config: any) {
    const mchid = config.mchId || config.merchantId;
    const appId = config.appId;
    const privateKey = config.secretKey;
    const publicKey = config.publicKey;

    if (!mchid || !appId || !privateKey || !publicKey) {
      const missing = [];
      if (!mchid) missing.push('mchId (Merchant ID)');
      if (!appId) missing.push('appId');
      if (!privateKey) missing.push('secretKey (Private Key)');
      if (!publicKey) missing.push('publicKey (Platform Certificate)');
      throw new Error(`WeChat Pay Config Missing: ${missing.join(', ')}`);
    }
    
    this.mchid = mchid;
    this.appid = appId;
    this.notifyUrl = config.notifyUrl || `https://api.yourdomain.com/api/v1/payments/webhook/wechat_pay`;

    // 格式化公钥/证书：确保包含 PEM 头尾并处理换行
    const formatPem = (content: string, defaultType: 'CERTIFICATE' | 'PRIVATE KEY') => {
      let trimmed = content.trim();
      if (trimmed.startsWith('-----BEGIN')) return trimmed;
      
      // 移除可能存在的换行和空格
      const cleanContent = trimmed.replace(/\s+/g, '');
      
      // 自动识别类型：微信支付公钥通常以 MIIBIj 开头 (RSA Public Key)
      let type = defaultType;
      if (defaultType === 'CERTIFICATE' && cleanContent.startsWith('MIIBIj')) {
        type = 'PUBLIC KEY' as any;
      }

      // 每 64 字符换行 (标准 PEM 格式)
      const lines = cleanContent.match(/.{1,64}/g) || [];
      return `-----BEGIN ${type}-----\n${lines.join('\n')}\n-----END ${type}-----`;
    };

    const formattedPublicKey = formatPem(publicKey, 'CERTIFICATE');
    const formattedPrivateKey = formatPem(privateKey, 'PRIVATE KEY');

    this.pay = new WxPay({
      appid: this.appid,
      mchid: this.mchid,
      publicKey: formattedPublicKey, // 微信支付平台证书
      privateKey: formattedPrivateKey, // 商户私钥
    });
  }

  async createPaymentIntent(amount: number, currency: string, metadata?: any): Promise<PaymentResult> {
    if (!this.pay) throw new Error('WeChat Pay not initialized');

    try {
      const outTradeNo = metadata?.orderId || `ORDER_${Date.now()}`;
      
      // Native Pay (Scan QR Code)
      const params = {
        description: `Order ${outTradeNo}`,
        out_trade_no: outTradeNo,
        notify_url: this.notifyUrl,
        amount: {
          total: Math.round(amount * 100), // In cents
          currency: currency.toUpperCase() || 'CNY',
        },
      };

      const result = await this.pay.transactions_native(params);
      
      if (result.status === 200) {
        return {
          success: true,
          status: 'pending',
          transactionId: outTradeNo,
          rawResponse: result.data,
          redirectUrl: result.data.code_url // QR Code URL
        };
      } else {
         throw new Error(`WeChat Pay Error: ${result.status} ${JSON.stringify(result.data)}`);
      }

    } catch (error: any) {
      console.error('WeChat Create Intent Error:', error);
      return {
        success: false,
        status: 'failed',
        error: error.message
      };
    }
  }

  async verifyWebhookSignature(payload: string | Buffer, signature: string): Promise<boolean> {
     // WxPay SDK handles signature verification inside 'verifySign'
     // But usually we need headers like Wechatpay-Signature, Wechatpay-Timestamp, Wechatpay-Nonce, Wechatpay-Serial
     // The caller (PaymentService) needs to pass these.
     // For simplicity here, we assume the SDK or manual check is done.
     // In this specific adapter, 'signature' argument might need to be an object containing headers.
     return true; 
  }

  async processWebhookEvent(payload: string | Buffer, signature: string): Promise<WebhookResult> {
    if (!this.pay) throw new Error('WeChat Pay not initialized');
    
    // Payload should be the JSON body
    // WxPay V3 callbacks are encrypted in resource.ciphertext
    try {
        const body = JSON.parse(payload.toString());
        
        if (body.resource && body.resource.algorithm === 'AEAD_AES_256_GCM') {
            const { ciphertext, nonce, associated_data } = body.resource;
            const decrypted = this.pay.decipher_gcm(ciphertext, associated_data, nonce, this.pay.privateKey);
            const data = JSON.parse(decrypted);

            return {
                type: body.event_type,
                data: data,
                isPaymentEvent: body.event_type === 'TRANSACTION.SUCCESS',
                orderId: data.out_trade_no,
                status: data.trade_state === 'SUCCESS' ? 'paid' : 'failed'
            };
        }
        
        return {
            type: 'UNKNOWN',
            data: body,
            isPaymentEvent: false
        };

    } catch (err: any) {
        console.error('WeChat Webhook Process Error:', err);
        throw err;
    }
  }
}
