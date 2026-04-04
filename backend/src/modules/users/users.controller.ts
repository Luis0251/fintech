import { Controller, Get, Put, Delete, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SaveApiKeyDto, SaveVisionApiKeyDto } from './users.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getProfile(@Request() req) {
    return this.usersService.findById(req.user.id);
  }

  @Put('me')
  async updateProfile(@Request() req, @Body() data: { name?: string }) {
    return this.usersService.updateProfile(req.user.id, data);
  }

  @Put('api-key')
  async saveApiKey(@Request() req, @Body() dto: SaveApiKeyDto) {
    await this.usersService.saveApiKey(req.user.id, dto.apiKey, dto.provider);
    return { success: true, message: 'API key saved successfully' };
  }

  @Get('api-key')
  async getApiKey(@Request() req) {
    const apiKey = await this.usersService.getApiKey(req.user.id);
    return { hasApiKey: !!apiKey };
  }

  @Delete('api-key')
  async deleteApiKey(@Request() req) {
    await this.usersService.deleteApiKey(req.user.id);
    return { success: true, message: 'API key deleted successfully' };
  }

  @Put('vision-api-key')
  async saveVisionApiKey(@Request() req, @Body() dto: SaveVisionApiKeyDto) {
    await this.usersService.saveVisionApiKey(req.user.id, dto.visionApiKey);
    return { success: true, message: 'Vision API key saved successfully' };
  }

  @Get('vision-api-key')
  async getVisionApiKey(@Request() req) {
    const visionApiKey = await this.usersService.getVisionApiKey(req.user.id);
    return { hasVisionApiKey: !!visionApiKey };
  }

  @Delete('vision-api-key')
  async deleteVisionApiKey(@Request() req) {
    await this.usersService.deleteVisionApiKey(req.user.id);
    return { success: true, message: 'Vision API key deleted successfully' };
  }
}