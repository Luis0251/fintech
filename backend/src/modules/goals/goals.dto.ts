import { IsString, IsNumber, IsOptional, IsDateString, IsBoolean } from 'class-validator';

export class CreateGoalDto {
  @IsString()
  name: string;

  @IsNumber()
  targetAmount: number;

  @IsNumber()
  @IsOptional()
  currentAmount?: number;

  @IsDateString()
  @IsOptional()
  deadline?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateGoalDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  targetAmount?: number;

  @IsNumber()
  @IsOptional()
  currentAmount?: number;

  @IsDateString()
  @IsOptional()
  deadline?: string;

  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;
}