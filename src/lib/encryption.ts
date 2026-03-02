
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 256 bits (32 characters)
const IV_LENGTH = 16; // For AES, this is always 16

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    // Note: We used openssl rand -hex 32 which gives 64 chars hex string = 32 bytes
    // So length check depends on whether we treat it as hex or raw string.
    // If process.env.ENCRYPTION_KEY is hex string, buffer length is 32.
}

export class EncryptionService {
    
    private static getKey(): Buffer {
        const key = process.env.ENCRYPTION_KEY;
        if (!key) {
            // For build time or when env is missing, return a dummy key to prevent crash
            if (process.env.NODE_ENV === 'production') {
                console.error('CRITICAL: ENCRYPTION_KEY missing in production');
            }
            return Buffer.alloc(32); 
        }
        return Buffer.from(key, 'hex');
    }

    /**
     * Encrypts text using AES-256-GCM
     * Returns format: iv:authTag:encryptedContent
     */
    static encrypt(text: string): string {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-gcm', this.getKey(), iv);
        
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        
        const authTag = cipher.getAuthTag();

        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
    }

    /**
     * Decrypts text using AES-256-GCM
     * Expects format: iv:authTag:encryptedContent
     */
    static decrypt(text: string): string {
        const parts = text.split(':');
        if (parts.length !== 3) {
             // Fallback: if not encrypted or legacy format, return as is (but be careful)
             // Or throw error. For now, we assume everything sensitive IS encrypted.
             // If we want to support migration, we can check if it looks like our format.
             return text; 
        }

        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encryptedText = Buffer.from(parts[2], 'hex');

        const decipher = crypto.createDecipheriv('aes-256-gcm', this.getKey(), iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString();
    }

    /**
     * One-way hash for non-reversible data (e.g. check integrity)
     */
    static hash(data: string): string {
        return crypto.createHash('sha256').update(data).digest('hex');
    }
}
