import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { GoalsModule } from './modules/goals/goals.module';
import { InsightsModule } from './modules/insights/insights.module';
import { EventsModule } from './modules/events/events.module';
import { OcrModule } from './modules/ocr/ocr.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      name: 'short',
      ttl: 1000,
      limit: 10,
    }, {
      name: 'medium',
      ttl: 10000,
      limit: 50,
    }, {
      name: 'long',
      ttl: 60000,
      limit: 200,
    }]),
    PrismaModule,
    EventsModule,
    AuthModule,
    UsersModule,
    AccountsModule,
    TransactionsModule,
    BudgetsModule,
    GoalsModule,
    InsightsModule,
    OcrModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}