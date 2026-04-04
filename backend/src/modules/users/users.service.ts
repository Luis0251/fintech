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

    // Decrypt the API key
    return this.encryptionService.decrypt(user.apiKey);
  }

  async deleteApiKey(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { apiKey: null },
    });
  }
}
