import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateAccountDto, UpdateAccountDto } from './accounts.dto';
import { EventsService } from '../events/events.service';

@Injectable()
export class AccountsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => EventsService))
    private eventsService: EventsService,
  ) {}

  async findAll(userId: string) {
    return this.prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });
  }

  async findOne(accountId: string, userId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }

  async create(userId: string, dto: CreateAccountDto) {
    const account = await this.prisma.account.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        balance: dto.balance || 0,
        currency: dto.currency || 'USD',
      },
    });

    // Emit event for real-time updates
    this.eventsService.emitAccount('created', account);

    return account;
  }

  async update(accountId: string, userId: string, dto: UpdateAccountDto) {
    await this.findOne(accountId, userId); // Verify ownership

    const account = await this.prisma.account.update({
      where: { id: accountId },
      data: dto,
    });

    // Emit event for real-time updates
    this.eventsService.emitAccount('updated', account);

    return account;
  }

  async delete(accountId: string, userId: string) {
    await this.findOne(accountId, userId); // Verify ownership

    await this.prisma.account.delete({
      where: { id: accountId },
    });

    // Emit event for real-time updates
    this.eventsService.emitAccount('deleted', { id: accountId });

    return { deleted: true };
  }

  async getTotalBalance(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { userId, isActive: true },
      select: { balance: true, type: true },
    });

    const total = accounts.reduce((sum, acc) => {
      // Credit accounts subtract from total
      if (acc.type === 'CREDIT') {
        return sum - acc.balance;
      }
      return sum + acc.balance;
    }, 0);

    return { total, accounts: accounts.length };
  }
}