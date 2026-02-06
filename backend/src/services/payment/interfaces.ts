
export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  status: 'pending' | 'succeeded' | 'failed';
  rawResponse?: any;
  clientSecret?: string; // For frontend SDKs (e.g. Stripe)
  redirectUrl?: string; // For redirect-based payments (e.g. Alipay)
  error?: string;
}

export interface WebhookResult {
  type: string;
  data: any;
  isPaymentEvent: boolean;
  orderId?: string;
  status?: 'paid' | 'failed' | 'refunded';
}

export interface IPaymentAdapter {
  /**
   * Initialize the adapter with configuration
   */
  initialize(config: any): void;

  /**
   * Create a payment intent or transaction
   */
  createPaymentIntent(amount: number, currency: string, metadata?: any): Promise<PaymentResult>;

  /**
   * Verify the webhook signature to ensure authenticity
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): Promise<boolean>;

  /**
   * Process a verified webhook event and extract relevant data
   */
  processWebhookEvent(payload: string | Buffer, signature: string): Promise<WebhookResult>;
}
