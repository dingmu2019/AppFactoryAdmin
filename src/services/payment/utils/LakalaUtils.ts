import crypto from 'crypto';

/**
 * 拉卡拉 V3 接口工具类
 * 负责 AES 加解密、RSA 签名验签
 */
export class LakalaUtils {
    
    // 生成随机 32 字节 AES Key
    static generateAesKey(): Buffer {
        return crypto.randomBytes(32);
    }

    // 生成随机 16 字节 IV
    static generateIv(): Buffer {
        return crypto.randomBytes(16);
    }

    /**
     * AES-256-CBC 加密
     * @param data 待加密数据 (通常是 JSON 对象)
     * @param key AES Key (32 bytes)
     * @param iv IV (16 bytes)
     * @returns hex string
     */
    static aesEncrypt(data: object | string, key: Buffer, iv?: Buffer): string {
        const text = typeof data === 'string' ? data : JSON.stringify(data);
        // 如果未提供 IV，生成全0或其他默认值？拉卡拉文档并未明确 IV 传输方式，
        // 但通常 V3 接口使用 ECB 模式或者特定的 IV 生成规则。
        // 根据常见支付接口 (如微信 V3)，通常使用 GCM。
        // 但根据搜索结果，拉卡拉使用 AES-256-CBC。
        // 如果 IV 不随密文传输，通常约定为全 0 或者截取 Key 前 16 位。
        // 这里假设 IV 是需要的，但如果没有传输通道，可能需要确认文档。
        // *修正*：拉卡拉 V3 接口通常将 IV 拼在密文前，或者使用 ECB (不安全)。
        // 搜索结果提到 "AES-256-CBC"，需要 IV。
        // 根据经验，拉卡拉 V3 的 `req_data` 加密可能只用了 key，或者 IV 是全 0。
        // 为了通用性，这里默认使用全 0 IV 如果未提供，或者由调用方控制。
        const validIv = iv || Buffer.alloc(16, 0); 

        const cipher = crypto.createCipheriv('aes-256-cbc', key, validIv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }

    /**
     * AES-256-CBC 解密
     * @param encryptedHex 密文 (hex)
     * @param key AES Key (32 bytes)
     * @param iv IV (16 bytes)
     * @returns 解密后的对象或字符串
     */
    static aesDecrypt(encryptedHex: string, key: Buffer, iv?: Buffer): any {
        const validIv = iv || Buffer.alloc(16, 0);
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, validIv);
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        try {
            return JSON.parse(decrypted);
        } catch (e) {
            return decrypted;
        }
    }

    /**
     * RSA 公钥加密 (用于加密 AES Key)
     * @param data 待加密数据 (AES Key Buffer)
     * @param publicKey 拉卡拉公钥 (PEM 格式)
     * @returns hex string
     */
    static rsaEncrypt(data: Buffer, publicKey: string): string {
        // 确保公钥格式正确
        const key = publicKey.includes('-----BEGIN') ? publicKey : 
            `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;

        const encrypted = crypto.publicEncrypt(
            {
                key,
                padding: crypto.constants.RSA_PKCS1_PADDING
            },
            data
        );
        return encrypted.toString('hex');
    }

    /**
     * RSA 私钥解密 (用于解密响应中的 AES Key)
     * @param encryptedHex 加密的 AES Key (hex)
     * @param privateKey 商户私钥 (PEM 格式)
     * @returns Buffer (AES Key)
     */
    static rsaDecrypt(encryptedHex: string, privateKey: string): Buffer {
        const key = privateKey.includes('-----BEGIN') ? privateKey : 
            `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;

        return crypto.privateDecrypt(
            {
                key,
                padding: crypto.constants.RSA_PKCS1_PADDING
            },
            Buffer.from(encryptedHex, 'hex')
        );
    }

    /**
     * SHA256withRSA 签名
     * @param params 待签名参数对象 (平铺)
     * @param privateKey 商户私钥
     * @returns hex string (大写)
     */
    static sign(params: any, privateKey: string): string {
        // 1. 筛选并排序
        const keys = Object.keys(params).sort();
        const kvList: string[] = [];
        
        for (const key of keys) {
            // 排除 signature 字段，排除空值 (undefined, null, '')
            if (key === 'signature' || params[key] === undefined || params[key] === null || params[key] === '') {
                continue;
            }
            kvList.push(`${key}=${params[key]}`);
        }
        
        const signStr = kvList.join('&');

        // 2. 签名
        const key = privateKey.includes('-----BEGIN') ? privateKey : 
            `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;

        const sign = crypto.createSign('SHA256');
        sign.update(signStr, 'utf8');
        return sign.sign(key, 'hex').toUpperCase();
    }

    /**
     * SHA256withRSA 验签
     * @param params 参数对象
     * @param signature 签名值 (hex)
     * @param publicKey 拉卡拉公钥
     * @returns boolean
     */
    static verify(params: any, signature: string, publicKey: string): boolean {
        // 1. 筛选并排序
        const keys = Object.keys(params).sort();
        const kvList: string[] = [];
        
        for (const key of keys) {
            if (key === 'signature' || params[key] === undefined || params[key] === null || params[key] === '') {
                continue;
            }
            kvList.push(`${key}=${params[key]}`);
        }
        
        const signStr = kvList.join('&');

        // 2. 验签
        const key = publicKey.includes('-----BEGIN') ? publicKey : 
            `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;

        const verify = crypto.createVerify('SHA256');
        verify.update(signStr, 'utf8');
        return verify.verify(key, signature, 'hex');
    }
}
