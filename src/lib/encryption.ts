
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 256 bits (32 characters)
const IV_LENGTH = 16; // For AES, this is always 16

// Fail fast: Validate ENCRYPTION_KEY on module load
if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is missing in environment variables. Application requires a 32-byte hex string key.');
}

if (ENCRYPTION_KEY.length !== 64 || !/^[0-9a-fA-F]+$/.test(ENCRYPTION_KEY)) {
    throw new Error(`ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Current length: ${ENCRYPTION_KEY.length}`);
}

export class EncryptionService {
    
    private static getKey(): Buffer {
        // Key is guaranteed to exist and be valid due to module-level check
        return Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
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
