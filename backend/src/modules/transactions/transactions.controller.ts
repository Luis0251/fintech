import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { OcrService, VisionOCRResult } from '../ocr/ocr.service';
import { CreateTransactionDto, UpdateTransactionDto } from './transactions.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(
    private transactionsService: TransactionsService,
    private ocrService: OcrService,
  ) {}

  @Get()
  async findAll(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('category') category?: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.transactionsService.findAll(req.user.id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      category,
      accountId,
    });
  }

  @Get('stats')
  async getStats(@Request() req, @Query('period') period?: 'week' | 'month' | 'year') {
    return this.transactionsService.getStats(req.user.id, period);
  }

  @Get('categories')
  async getCategories() {
    return this.transactionsService.getCategories();
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.transactionsService.findOne(id, req.user.id);
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(req.user.id, dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Request() req, @Body() dto: UpdateTransactionDto) {
    return this.transactionsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    return this.transactionsService.delete(id, req.user.id);
  }

  @Post('ocr')
  async processOcr(@Request() req, @Body() body: { imageData: string }): Promise<VisionOCRResult> {
    const result = await this.ocrService.processImage(body.imageData, req.user.id);
    return result;
  }
}