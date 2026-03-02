
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
            throw new Error('ENCRYPTION_KEY is not defined in environment variables');
        }
        
        // Handle both 64-char hex string and 32-char raw string
        if (key.length === 64) {
            return Buffer.from(key, 'hex');
        }
        return Buffer.from(key).slice(0, 32);
    }

    /**
     * Encrypts text using AES-256-GCM
     * Returns format: iv:authTag:encryptedContent
     */
    static encrypt(text: string): string {
        if (!text) return text;
        try {
            const iv = crypto.randomBytes(IV_LENGTH);
            const cipher = crypto.createCipheriv('aes-256-gcm', this.getKey(), iv);
            
            let encrypted = cipher.update(text);
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            
            const authTag = cipher.getAuthTag();

            return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
        } catch (err: any) {
            console.error('[EncryptionService] Encryption failed:', err.message);
            return text;
        }
    }

    /**
     * Decrypts text using AES-256-GCM
     * Expects format: iv:authTag:encryptedContent
     */
    static decrypt(text: string): string {
        if (!text || typeof text !== 'string') return text;
        
        const parts = text.split(':');
        if (parts.length !== 3) {
             return text; 
        }

        try {
            const iv = Buffer.from(parts[0], 'hex');
            const authTag = Buffer.from(parts[1], 'hex');
            const encryptedText = Buffer.from(parts[2], 'hex');

            const decipher = crypto.createDecipheriv('aes-256-gcm', this.getKey(), iv);
            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(encryptedText);
            decrypted = Buffer.concat([decrypted, decipher.final()]);

            return decrypted.toString();
        } catch (err: any) {
            console.error('[EncryptionService] Decryption failed (Authentication Error):', err.message);
            // Return original text as fallback instead of throwing
            // This prevents system-wide crashes when a single key is invalid
            return text;
        }
    }

    /**
     * One-way hash for non-reversible data (e.g. check integrity)
     */
    static hash(data: string): string {
        return crypto.createHash('sha256').update(data).digest('hex');
    }
}
