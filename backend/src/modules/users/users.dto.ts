import { IsString, IsEnum, IsOptional } from 'class-validator';

export class SaveApiKeyDto {
  @IsString()
  apiKey: string;

  @IsEnum(['gemini', 'openai'])
  provider: 'gemini' | 'openai';
}

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  name?: string;
}
