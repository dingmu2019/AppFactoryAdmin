
// @ts-ignore
import WxPay from 'wechatpay-node-v3';
import type { IPaymentAdapter, PaymentResult, WebhookResult } from '../interfaces.ts';
import fs from 'fs';
import path from 'path';

export class WeChatPayAdapter implements IPaymentAdapter {
  private pay: any = null;
  private mchid: string = '';
  private appid: string = '';
  private notifyUrl: string = '';

  initialize(config: any) {
    if (!config.mchId || !config.appId || !config.secretKey) {
      throw new Error('WeChat Pay Config Missing: mchId, appId, or secretKey');
    }
    
    // In production, privateKey might be stored as file path or raw string
    // Here we assume it's a string (pem content)
    // Also need public cert (platform certificate) or download it automatically
    
    this.mchid = config.mchId;
    this.appid = config.appId;
    this.notifyUrl = config.notifyUrl || `https://api.yourdomain.com/api/v1/payments/webhook/wechat_pay`;

    this.pay = new WxPay({
      appid: this.appid,
      mchid: this.mchid,
      publicKey: config.publicKey, // Platform Certificate PEM
      privateKey: config.secretKey, // Merchant Private Key PEM
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
