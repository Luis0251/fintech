import { IsString } from 'class-validator';

export class GenerateInsightsDto {}

export class ChatDto {
  @IsString()
  message: string;
}