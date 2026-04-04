import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateBudgetDto, UpdateBudgetDto } from './budgets.dto';
import { EventsService } from '../events/events.service';

@Injectable()
export class BudgetsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => EventsService))
    private eventsService: EventsService,
  ) {}

  async findAll(userId: string) {
    const budgets = await this.prisma.budget.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate spent amounts from transactions
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const accounts = await this.prisma.account.findMany({
      where: { userId },
      select: { id: true },
    });
    const accountIds = accounts.map(a => a.id);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        accountId: { in: accountIds },
        type: 'EXPENSE',
        date: { gte: startOfMonth },
      },
    });

    // Map spent amounts to budgets
    return budgets.map(budget => {
      const spent = transactions
        .filter(t => t.category === budget.category)
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        ...budget,
        spentAmount: spent,
        percentUsed: (spent / budget.limitAmount) * 100,
        remaining: budget.limitAmount - spent,
      };
    });
  }

  async findOne(budgetId: string, userId: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id: budgetId, userId },
    });

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    return budget;
  }

  async create(userId: string, dto: CreateBudgetDto) {
    // Check if budget for category already exists
    const existing = await this.prisma.budget.findFirst({
      where: {
        userId,
        category: dto.category,
        isActive: true,
      },
    });

    let budget;
    if (existing) {
      // Update existing budget instead
      budget = await this.prisma.budget.update({
        where: { id: existing.id },
        data: { limitAmount: dto.limitAmount, period: dto.period },
      });
      this.eventsService.emitBudget('updated', budget);
    } else {
      budget = await this.prisma.budget.create({
        data: {
          userId,
          category: dto.category,
          limitAmount: dto.limitAmount,
          period: dto.period || 'MONTHLY',
        },
      });
      this.eventsService.emitBudget('created', budget);
    }

    return budget;
  }

  async update(budgetId: string, userId: string, dto: UpdateBudgetDto) {
    await this.findOne(budgetId, userId);

    const budget = await this.prisma.budget.update({
      where: { id: budgetId },
      data: dto,
    });

    // Emit event for real-time updates
    this.eventsService.emitBudget('updated', budget);

    return budget;
  }

  async delete(budgetId: string, userId: string) {
    await this.findOne(budgetId, userId);

    // Soft delete - just mark as inactive
    await this.prisma.budget.update({
      where: { id: budgetId },
      data: { isActive: false },
    });

    // Emit event for real-time updates
    this.eventsService.emitBudget('deleted', { id: budgetId });

    return { deleted: true };
  }

  async getAlerts(userId: string) {
    const budgets = await this.findAll(userId);
    
    return budgets
      .filter(b => b.percentUsed >= 80)
      .map(b => ({
        budgetId: b.id,
        category: b.category,
        percentUsed: b.percentUsed,
        spent: b.spentAmount,
        limit: b.limitAmount,
        severity: b.percentUsed >= 100 ? 'critical' : b.percentUsed >= 90 ? 'warning' : 'info',
      }));
  }
}