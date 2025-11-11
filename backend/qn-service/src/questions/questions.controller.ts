import { Controller, Get, Query, UseGuards, Param, NotFoundException } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';

@Controller('questions')
@UseGuards(BearerAuthGuard)
export class QuestionsController {
  constructor(private readonly svc: QuestionsService) {}

  @Get(':id')
  async byId(@Param('id') idParam: string) {
    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      throw new NotFoundException('Invalid id');
    }
    const doc = await this.svc.findByIdExact(id);
    if (!doc) {
      throw new NotFoundException('Question not found');
    }
    return doc;
  }

  @Get()
  async list(
    @Query('limit') limit?: string, // legacy; maps to pageSize if provided
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('topic') topic?: string,
    @Query('difficulty') difficulty?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
    @Query('q') q?: string,
  ) {
    const size = Number(pageSize || limit) || 20;
    const p = Math.max(1, Number(page) || 1);
    return this.svc.search({ topic, difficulty, sortBy, sortDir, q, page: p, pageSize: size });
  }
}
