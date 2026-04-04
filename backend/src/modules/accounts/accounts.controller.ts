import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto, UpdateAccountDto } from './accounts.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private accountsService: AccountsService) {}

  @Get()
  async findAll(@Request() req) {
    return this.accountsService.findAll(req.user.id);
  }

  @Get('balance')
  async getTotalBalance(@Request() req) {
    return this.accountsService.getTotalBalance(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.accountsService.findOne(id, req.user.id);
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateAccountDto) {
    return this.accountsService.create(req.user.id, dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Request() req, @Body() dto: UpdateAccountDto) {
    return this.accountsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    return this.accountsService.delete(id, req.user.id);
  }
}