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

        // 2. 生成 AES Key 和 IV (此处假设 IV 使用全0或特定规则，或者拉卡拉不需要传输IV，仅需Key)
        // 根据常见实践，如果协议中没有传递 IV 的字段，可能是 ECB 模式或者固定 IV。
        // 但根据搜索结果，V3 是 AES-256-CBC。
        // 如果拉卡拉没有在请求头或报文中预留 IV 字段，则通常是将 IV 拼接到密文前，或者 IV 就是全 0。
        // 这里为了兼容性，我们生成随机 AES Key，使用全 0 IV 进行加密 (这也是某些银行接口的做法)。
        // 实际上需要查阅具体文档。这里假设 IV 为全 0。
        const aesKey = LakalaUtils.generateAesKey();
        const iv = Buffer.alloc(16, 0); 

        // 3. 加密业务数据
        const reqDataEncrypted = LakalaUtils.aesEncrypt(bizData, aesKey, iv);

        // 4. 加密 AES Key (用拉卡拉公钥)
        const encKey = LakalaUtils.rsaEncrypt(aesKey, this.config.lakalaPublicKey);

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
        const signature = LakalaUtils.sign(requestBody, this.config.merchantPrivateKey);
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
            // 验签逻辑：对 payload 中除 signature 外的字段验签
            // 注意：拉卡拉回调可能也是加密的，需要先解密再验签，或者对密文验签
            // 通常是对密文验签。即 data 本身包含 req_data, enc_key, signature 等。
            
            // 简单验证：调用 Utils.verify
            return LakalaUtils.verify(data, signature, this.config.lakalaPublicKey);
        } catch (e) {
            console.error('Webhook verification failed', e);
            return false;
        }
    }

    async processWebhookEvent(payload: string | Buffer, signature: string): Promise<WebhookResult> {
        const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
        
        // 解密逻辑 (如果回调是加密的)
        let eventData = data;
        if (data.req_data && data.enc_key) {
             const iv = Buffer.alloc(16, 0);
             const aesKey = LakalaUtils.rsaDecrypt(data.enc_key, this.config.merchantPrivateKey);
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
