import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly saltLength = 32;
  private readonly secret: Buffer;

  constructor() {
    // Use JWT_SECRET as the encryption key base
    this.secret = scryptSync(
      process.env.JWT_SECRET || 'fintech-secret-key-change-in-prod',
      'salt',
      this.keyLength,
    );
  }

  /**
   * Encrypt a string (like API key)
   */
  encrypt(text: string): string {
    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv(this.algorithm, this.secret, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return iv + encrypted data
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt a string
   */
  decrypt(encryptedText: string): string {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');

    const decipher = createDecipheriv(this.algorithm, this.secret, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
