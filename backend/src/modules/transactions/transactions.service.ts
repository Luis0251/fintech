import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateTransactionDto, UpdateTransactionDto } from './transactions.dto';
import { EventsService } from '../events/events.service';

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => EventsService))
    private eventsService: EventsService,
  ) {}

  async findAll(userId: string, filters?: { startDate?: Date; endDate?: Date; category?: string; accountId?: string }) {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      select: { id: true },
    });
    const accountIds = accounts.map(a => a.id);

    const where: any = {
      accountId: { in: accountIds },
    };

    if (filters?.startDate) {
      where.date = { ...where.date, gte: filters.startDate };
    }
    if (filters?.endDate) {
      where.date = { ...where.date, lte: filters.endDate };
    }
    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.accountId) {
      where.accountId = filters.accountId;
    }

    return this.prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        account: {
          select: { id: true, name: true, type: true },
        },
      },
    });
  }

  async findOne(transactionId: string, userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      select: { id: true },
    });
    const accountIds = accounts.map(a => a.id);

    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, accountId: { in: accountIds } },
      include: { account: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async create(userId: string, dto: CreateTransactionDto) {
    // Verify account ownership
    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, userId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        accountId: dto.accountId,
        amount: dto.amount,
        type: dto.type,
        category: dto.category,
        description: dto.description,
        date: dto.date ? new Date(dto.date) : new Date(),
        isRecurring: dto.isRecurring || false,
      },
      include: { account: true },
    });

    // Update account balance
    const balanceUpdate = dto.type === 'EXPENSE' 
      ? account.balance - dto.amount 
      : account.balance + dto.amount;

    await this.prisma.account.update({
      where: { id: dto.accountId },
      data: { balance: balanceUpdate },
    });

    // Emit event for real-time updates
    this.eventsService.emitTransaction('created', transaction);

    return transaction;
  }

  async update(transactionId: string, userId: string, dto: UpdateTransactionDto) {
    await this.findOne(transactionId, userId); // Verify ownership

    return this.prisma.transaction.update({
      where: { id: transactionId },
      data: dto,
    });
  }

  async delete(transactionId: string, userId: string) {
    const transaction = await this.findOne(transactionId, userId);

    // Reverse the balance change
    const account = await this.prisma.account.findUnique({
      where: { id: transaction.accountId },
    });

    const balanceUpdate = transaction.type === 'EXPENSE'
      ? account!.balance + transaction.amount
      : account!.balance - transaction.amount;

    await this.prisma.account.update({
      where: { id: transaction.accountId },
      data: { balance: balanceUpdate },
    });

    await this.prisma.transaction.delete({
      where: { id: transactionId },
    });

    return { deleted: true };
  }

  // Statistics methods
  async getStats(userId: string, period: 'week' | 'month' | 'year' = 'month') {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      select: { id: true },
    });
    const accountIds = accounts.map(a => a.id);

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const transactions = await this.prisma.transaction.findMany({
      where: {
        accountId: { in: accountIds },
        date: { gte: startDate },
      },
    });

    const income = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    const byCategory = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    return {
      income,
      expenses,
      balance: income - expenses,
      byCategory: Object.entries(byCategory).map(([category, amount]) => ({
        category,
        amount,
      })),
    };
  }

  async getCategories() {
    return [
      'Food & Dining',
      'Transportation',
      'Shopping',
      'Entertainment',
      'Bills & Utilities',
      'Healthcare',
      'Education',
      'Travel',
      'Income',
      'Transfer',
      'Other',
    ];
  }
}