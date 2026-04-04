import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto, UpdateBudgetDto } from './budgets.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('budgets')
@UseGuards(JwtAuthGuard)
export class BudgetsController {
  constructor(private budgetsService: BudgetsService) {}

  @Get()
  async findAll(@Request() req) {
    return this.budgetsService.findAll(req.user.id);
  }

  @Get('alerts')
  async getAlerts(@Request() req) {
    return this.budgetsService.getAlerts(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.budgetsService.findOne(id, req.user.id);
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateBudgetDto) {
    return this.budgetsService.create(req.user.id, dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Request() req, @Body() dto: UpdateBudgetDto) {
    return this.budgetsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    return this.budgetsService.delete(id, req.user.id);
  }
}