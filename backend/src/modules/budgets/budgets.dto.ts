import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { BudgetPeriod } from '@prisma/client';

export class CreateBudgetDto {
  @IsString()
  category: string;

  @IsNumber()
  limitAmount: number;

  @IsEnum(BudgetPeriod)
  @IsOptional()
  period?: BudgetPeriod;
}

export class UpdateBudgetDto {
  @IsNumber()
  @IsOptional()
  limitAmount?: number;

  @IsEnum(BudgetPeriod)
  @IsOptional()
  period?: BudgetPeriod;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}