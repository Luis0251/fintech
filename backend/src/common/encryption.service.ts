import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly salt = 'fintech-salt-v1';
  private readonly secret: Buffer;

  constructor() {
    const password = process.env.JWT_SECRET || 'fintech-secret-key-change-in-prod';
    this.secret = scryptSync(password, this.salt, this.keyLength);
  }

  /**
   * Encrypt a string (like API key)
   */
  encrypt(text: string): string {
    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv(this.algorithm, this.secret, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt a string
   */
  decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    
    if (parts.length === 3) {
      const [ivHex, authTagHex, encrypted] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = createDecipheriv(this.algorithm, this.secret, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } else if (parts.length === 2) {
      const [ivHex, encrypted] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      
      try {
        const decipher = createDecipheriv(this.algorithm, this.secret, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } catch (err) {
        console.error('Old format decrypt failed:', err);
        throw new Error('Could not decrypt - key may be corrupted. Please save a new key.');
      }
    } else {
      throw new Error('Invalid encrypted text format');
    }
  }
}