import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { InsightsService, Insight } from './insights.service';
import { ChatDto } from './insights.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('insights')
@UseGuards(JwtAuthGuard)
export class InsightsController {
  constructor(private insightsService: InsightsService) {}

  @Get()
  async getInsights(@Request() req) {
    return this.insightsService.getInsights(req.user.id);
  }

  @Post('generate')
  async generateInsights(@Request() req): Promise<Insight[]> {
    return this.insightsService.generateInsights(req.user.id);
  }

  @Post('chat')
  async chat(@Request() req, @Body() dto: ChatDto) {
    return { response: await this.insightsService.chat(req.user.id, dto.message) };
  }

  @Get('chat/history')
  async getChatHistory(@Request() req) {
    return this.insightsService.getChatHistory(req.user.id);
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    return this.insightsService.markAsRead(id, req.user.id);
  }
}