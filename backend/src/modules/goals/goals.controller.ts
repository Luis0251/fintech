import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { CreateGoalDto, UpdateGoalDto } from './goals.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(private goalsService: GoalsService) {}

  @Get()
  async findAll(@Request() req) {
    return this.goalsService.findAll(req.user.id);
  }

  @Get('summary')
  async getSummary(@Request() req) {
    return this.goalsService.getSummary(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.goalsService.findOne(id, req.user.id);
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateGoalDto) {
    return this.goalsService.create(req.user.id, dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Request() req, @Body() dto: UpdateGoalDto) {
    return this.goalsService.update(id, req.user.id, dto);
  }

  @Post(':id/contribute')
  async addContribution(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { amount: number },
  ) {
    return this.goalsService.addContribution(id, req.user.id, body.amount);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    return this.goalsService.delete(id, req.user.id);
  }
}