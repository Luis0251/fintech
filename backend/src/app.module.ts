import { Module } from '@nestjs/common';
import { PrismaModule } from './common/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { GoalsModule } from './modules/goals/goals.module';
import { InsightsModule } from './modules/insights/insights.module';
import { EventsModule } from './modules/events/events.module';

@Module({
  imports: [
    PrismaModule,
    EventsModule,
    AuthModule,
    UsersModule,
    AccountsModule,
    TransactionsModule,
    BudgetsModule,
    GoalsModule,
    InsightsModule,
  ],
})
export class AppModule {}