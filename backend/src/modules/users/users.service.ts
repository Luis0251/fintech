import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { EncryptionService } from '../../common/encryption.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {}

  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, data: { name?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
  }

  async saveApiKey(userId: string, apiKey: string, provider: 'gemini' | 'openai'): Promise<void> {
    // Encrypt the API key before storing
    const encryptedKey = this.encryptionService.encrypt(apiKey);
    
    await this.prisma.user.update({
      where: { id: userId },
      data: { apiKey: encryptedKey },
    });
  }

  async getApiKey(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { apiKey: true },
    });

    if (!user?.apiKey) {
      return null;
    }

    try {
      return this.encryptionService.decrypt(user.apiKey);
    } catch (err) {
      console.error('Error decrypting apiKey, clearing corrupted data:', err);
      await this.prisma.user.update({
        where: { id: userId },
        data: { apiKey: null },
      });
      return null;
    }
  }

  async deleteApiKey(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { apiKey: null },
    });
  }

  async saveVisionApiKey(userId: string, visionApiKey: string): Promise<void> {
    try {
      console.log('=== saveVisionApiKey called ===');
      console.log('userId:', userId);
      console.log('API key length:', visionApiKey.length);
      
      const encryptedKey = this.encryptionService.encrypt(visionApiKey);
      
      console.log('Encrypted key format:', encryptedKey);
      console.log('Encrypted key parts count:', encryptedKey.split(':').length);
      
      await this.prisma.user.update({
        where: { id: userId },
        data: { visionApiKey: encryptedKey },
      });
      
      console.log('=== saveVisionApiKey SUCCESS ===');
    } catch (err) {
      console.error('Error saving visionApiKey:', err);
      throw new Error('Failed to save vision API key');
    }
  }

  async getVisionApiKey(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { visionApiKey: true },
    });

    console.log('=== getVisionApiKey DEBUG ===');
    console.log('userId:', userId);
    console.log('has visionApiKey in DB:', !!user?.visionApiKey);
    console.log('===========================');

    if (!user?.visionApiKey) {
      return null;
    }

    try {
      const decrypted = this.encryptionService.decrypt(user.visionApiKey);
      console.log('=== Decryption SUCCESS ===');
      return decrypted;
    } catch (err) {
      console.error('=== Decryption FAILED ===', err);
      console.error('Error decrypting visionApiKey, clearing corrupted data:', err);
      await this.prisma.user.update({
        where: { id: userId },
        data: { visionApiKey: null },
      });
      return null;
    }
  }

  async deleteVisionApiKey(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { visionApiKey: null },
    });
  }
}
