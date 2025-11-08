import { Controller, Get, Post, Body, Req, UseGuards, Query } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';

import { CompleteQuestionDto } from './dto/complete-question.dto';

@Controller('questions')
@UseGuards(BearerAuthGuard)
export class QuestionsController {
  constructor(private readonly svc: QuestionsService) {}
  @Get()
  async list(@Query('limit') limit?: string) {
    const n = Number(limit) || 5;
    return this.svc.findTop(n);
  }

  /**
   * Endpoint to mark a question as completed and update user points.
   * Expects questionId in body, uses user from JWT.
   */
  @Post('complete')
  async completeQuestion(@Req() req: any, @Body() dto: CompleteQuestionDto) {
    const userId = req.user?.sub;
    if (!userId) throw new Error('User not authenticated');
    return this.svc.completeQuestion(userId, dto.questionId);
  }
}