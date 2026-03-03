
import crypto from 'crypto';
const IV_LENGTH = 16; // For AES, this is always 16

export class EncryptionService {
    
    private static getKey(): Buffer {
        const key = process.env.ENCRYPTION_KEY;
        if (!key) {
            throw new Error('ENCRYPTION_KEY is missing in environment variables');
        }
        if (key.length !== 64 || !/^[0-9a-fA-F]+$/.test(key)) {
            throw new Error(`ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Current length: ${key.length}`);
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
