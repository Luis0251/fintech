import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateGoalDto, UpdateGoalDto } from './goals.dto';
import { EventsService } from '../events/events.service';

@Injectable()
export class GoalsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => EventsService))
    private eventsService: EventsService,
  ) {}

  async findAll(userId: string) {
    const goals = await this.prisma.goal.findMany({
      where: { userId },
      orderBy: { deadline: 'asc' },
    });

    return goals.map(goal => ({
      ...goal,
      percentComplete: (goal.currentAmount / goal.targetAmount) * 100,
      remaining: goal.targetAmount - goal.currentAmount,
      daysLeft: goal.deadline 
        ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null,
    }));
  }

  async findOne(goalId: string, userId: string) {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, userId },
    });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    return {
      ...goal,
      percentComplete: (goal.currentAmount / goal.targetAmount) * 100,
      remaining: goal.targetAmount - goal.currentAmount,
      daysLeft: goal.deadline 
        ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null,
    };
  }

  async create(userId: string, dto: CreateGoalDto) {
    const goal = await this.prisma.goal.create({
      data: {
        userId,
        name: dto.name,
        targetAmount: dto.targetAmount,
        currentAmount: dto.currentAmount || 0,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        description: dto.description,
      },
    });

    // Emit event for real-time updates
    this.eventsService.emitGoal('created', goal);

    return goal;
  }

  async update(goalId: string, userId: string, dto: UpdateGoalDto) {
    await this.findOne(goalId, userId);

    const goal = await this.prisma.goal.update({
      where: { id: goalId },
      data: {
        ...dto,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        isCompleted: dto.currentAmount && dto.targetAmount && dto.currentAmount >= dto.targetAmount ? true : undefined,
      },
    });

    // Emit event for real-time updates
    this.eventsService.emitGoal('updated', goal);

    return goal;
  }

  async addContribution(goalId: string, userId: string, amount: number) {
    const goal = await this.findOne(goalId, userId);
    
    const newAmount = goal.currentAmount + amount;
    const isCompleted = newAmount >= goal.targetAmount;

    const updatedGoal = await this.prisma.goal.update({
      where: { id: goalId },
      data: {
        currentAmount: newAmount,
        isCompleted,
      },
    });

    // Emit event for real-time updates
    this.eventsService.emitGoal('updated', updatedGoal);

    return updatedGoal;
  }

  async delete(goalId: string, userId: string) {
    await this.findOne(goalId, userId);

    await this.prisma.goal.delete({
      where: { id: goalId },
    });

    // Emit event for real-time updates
    this.eventsService.emitGoal('deleted', { id: goalId });

    return { deleted: true };
  }

  async getSummary(userId: string) {
    const goals = await this.findAll(userId);
    
    const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
    const completed = goals.filter(g => g.isCompleted).length;
    const inProgress = goals.filter(g => !g.isCompleted).length;

    return {
      totalGoals: goals.length,
      completed,
      inProgress,
      totalTarget,
      totalSaved,
      overallProgress: totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0,
    };
  }
}