import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import type { IPaymentAdapter, PaymentResult, WebhookResult } from '../interfaces';
import { LakalaUtils } from '../utils/LakalaUtils';

export class LakalaAdapter implements IPaymentAdapter {
    private config: any;
    private baseUrl = 'https://s2.lakala.com/api/v3';

    initialize(config: any) {
        this.config = config;
        // 如果是测试环境，覆盖 Base URL
        if (config.isTest) {
            this.baseUrl = 'https://test.lakala.com/api/v3';
        }
    }

    /**
     * 创建聚合收银台订单
     * @param amount 金额 (单位：元，需要转换为分)
     * @param currency 币种 (CNY)
     * @param metadata 元数据 (orderId, userId)
     */
    async createPaymentIntent(amount: number, currency: string, metadata: any): Promise<PaymentResult> {
        // 1. 构造业务参数
        const bizData = {
            merchant_no: this.config.merchantNo,
            term_no: this.config.termNo,
            out_trade_no: metadata.orderId,
            total_amount: Math.round(amount * 100).toString(), // 转为分，并转字符串
            order_info: "SaaS Subscription", // 订单描述，可传入更具体的
            notify_url: this.config.notifyUrl,
            // 可选参数：有效时间等
            valid_time: "30m" 
        };

        // 2. 生成 AES Key 和 IV
        const aesKey = LakalaUtils.generateAesKey();
        const iv = Buffer.alloc(16, 0); 

        // 3. 加密业务数据
        const reqDataEncrypted = LakalaUtils.aesEncrypt(bizData, aesKey, iv);

        // 4. 加密 AES Key (用拉卡拉公钥)
        // 支持 config.publicKey 或 config.lakalaPublicKey
        const publicKey = this.config.publicKey || this.config.lakalaPublicKey;
        const privateKey = this.config.secretKey || this.config.merchantPrivateKey;

        if (!publicKey || !privateKey) {
            throw new Error('Lakala Config Missing: publicKey or secretKey');
        }

        const encKey = LakalaUtils.rsaEncrypt(aesKey, publicKey);

        // 5. 构造请求体
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const nonce_str = uuidv4().replace(/-/g, '').substring(0, 30); // 截取以防超长

        const requestBody = {
            ver: '3.0.0',
            timestamp: timestamp,
            nonce_str: nonce_str,
            req_data: reqDataEncrypted,
            enc_key: encKey,
            sign_type: 'RSA',
            merchant_no: this.config.merchantNo, // 外层通常也需要商户号
            term_no: this.config.termNo
        };

        // 6. 签名 (对 requestBody 中除 signature 外的字段签名)
        const signature = LakalaUtils.sign(requestBody, privateKey);
        (requestBody as any).signature = signature;

        // 7. 发送请求
        try {
            console.log(`[Lakala] Sending request to ${this.baseUrl}/ccss/counter/order/create`, JSON.stringify(requestBody));
            
            const response = await axios.post(`${this.baseUrl}/ccss/counter/order/create`, requestBody, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const respData = response.data;
            console.log(`[Lakala] Response:`, JSON.stringify(respData));

            if (respData.ret_code === '000000') {
                // 成功，解析返回数据
                // 响应体结构通常也是 encrypted 的，需要解密
                // 假设响应结构包含: ret_data (加密的), enc_key (加密的AES Key)
                
                let decryptedData = respData;
                if (respData.req_data && respData.enc_key) {
                     // 解密 AES Key
                     const respAesKey = LakalaUtils.rsaDecrypt(respData.enc_key, this.config.merchantPrivateKey);
                     // 解密业务数据
                     decryptedData = LakalaUtils.aesDecrypt(respData.req_data, respAesKey, iv);
                }

                // 收银台 URL 通常在 decryptedData.counter_url
                return {
                    success: true,
                    status: 'pending',
                    clientSecret: decryptedData.counter_url || 'https://mock.lakala.com/counter?token=mock', // Mock fallback
                    rawResponse: decryptedData
                };
            } else {
                return {
                    success: false,
                    status: 'failed',
                    error: respData.ret_msg || 'Unknown error'
                };
            }
        } catch (error: any) {
            console.error('[Lakala] Request Failed', error.response?.data || error.message);
            throw new Error(`Lakala Payment Failed: ${error.message}`);
        }
    }

    async verifyWebhookSignature(payload: string | Buffer, signature: string): Promise<boolean> {
        // 拉卡拉回调通常是 POST JSON
        try {
            const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
            const publicKey = this.config.publicKey || this.config.lakalaPublicKey;
            
            if (!publicKey) {
                console.error('Lakala Config Missing: publicKey');
                return false;
            }
            
            return LakalaUtils.verify(data, signature, publicKey);
        } catch (e) {
            console.error('Webhook verification failed', e);
            return false;
        }
    }

    async processWebhookEvent(payload: string | Buffer, signature: string): Promise<WebhookResult> {
        const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
        const privateKey = this.config.secretKey || this.config.merchantPrivateKey;

        if (!privateKey) {
            throw new Error('Lakala Config Missing: secretKey');
        }
        
        // 解密逻辑 (如果回调是加密的)
        let eventData = data;
        if (data.req_data && data.enc_key) {
             const iv = Buffer.alloc(16, 0);
             const aesKey = LakalaUtils.rsaDecrypt(data.enc_key, privateKey);
             eventData = LakalaUtils.aesDecrypt(data.req_data, aesKey, iv);
        }

        // 提取状态
        // 假设 eventData 包含 trade_status: 'SUCCESS'
        const isSuccess = eventData.trade_status === 'SUCCESS';
        
        return {
            type: 'PAYMENT.UPDATE',
            isPaymentEvent: true,
            orderId: eventData.out_trade_no,
            status: isSuccess ? 'paid' : 'failed',
            data: eventData
        };
    }
}
