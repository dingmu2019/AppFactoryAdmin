
import { AlipaySdk, AlipayFormData } from 'alipay-sdk';
import type { IPaymentAdapter, PaymentResult, WebhookResult } from '../interfaces';

export class AlipayAdapter implements IPaymentAdapter {
  private alipay: any = null;
  private notifyUrl: string = '';

  initialize(config: any) {
    if (!config.appId || !config.secretKey || !config.publicKey) {
      throw new Error('Alipay Config Missing: appId, secretKey (private key), or publicKey (alipay public key)');
    }

    this.notifyUrl = config.notifyUrl || `https://api.yourdomain.com/api/v1/payments/webhook/alipay`;

    this.alipay = new AlipaySdk({
      appId: config.appId,
      privateKey: config.secretKey, // App Private Key
      alipayPublicKey: config.publicKey, // Alipay Public Key
      gateway: config.sandbox ? 'https://openapi-sandbox.dl.alipaydev.com/gateway.do' : 'https://openapi.alipay.com/gateway.do',
    });
  }

  async createPaymentIntent(amount: number, currency: string, metadata?: any): Promise<PaymentResult> {
    if (!this.alipay) throw new Error('Alipay not initialized');

    try {
      const outTradeNo = metadata?.orderId || `ORDER_${Date.now()}`;
      
      // Page Pay (Desktop Web)
      // Returns a URL string for GET method
      const result = await this.alipay.pageExec(
        'alipay.trade.page.pay',
        {
          method: 'GET',
          bizContent: {
            outTradeNo: outTradeNo,
            productCode: 'FAST_INSTANT_TRADE_PAY',
            totalAmount: amount.toFixed(2),
            subject: `Order ${outTradeNo}`,
            body: `Payment for Order ${outTradeNo}`,
          },
          notifyUrl: this.notifyUrl,
        }
      );
      
      // Result is the URL or Form HTML
      return {
        success: true,
        status: 'pending',
        transactionId: outTradeNo,
        rawResponse: result,
        redirectUrl: result // Usually a URL or full HTML form
      };

    } catch (error: any) {
      console.error('Alipay Create Intent Error:', error);
      return {
        success: false,
        status: 'failed',
        error: error.message
      };
    }
  }

  async verifyWebhookSignature(payload: string | Buffer, signature: string): Promise<boolean> {
     // Alipay verification needs the full map of parameters (sorted), not just payload/signature
     // The 'payload' passed here should ideally be the req.body object (if x-www-form-urlencoded)
     // or parsed JSON. 
     // For Alipay, signature is inside the body as 'sign'.
     
     // We assume payload is the parsed body object (as stringified JSON or similar)
     if (!this.alipay) return false;
     
     try {
         // Assuming payload is passed as JSON string, we need object
         const params = typeof payload === 'string' ? JSON.parse(payload) : payload;
         return this.alipay.checkNotifySign(params);
     } catch (err) {
         console.error('Alipay Verify Error:', err);
         return false;
     }
  }

  async processWebhookEvent(payload: string | Buffer, signature: string): Promise<WebhookResult> {
    const params = typeof payload === 'string' ? JSON.parse(payload) : payload;
    
    // Check trade status
    const isPaid = params.trade_status === 'TRADE_SUCCESS' || params.trade_status === 'TRADE_FINISHED';
    
    return {
        type: 'alipay.trade.status.sync',
        data: params,
        isPaymentEvent: isPaid,
        orderId: params.out_trade_no,
        status: isPaid ? 'paid' : 'failed'
    };
  }
}
