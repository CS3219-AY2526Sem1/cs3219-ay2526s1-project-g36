/*
AI Assistance Disclosure:
Tool: OpenAI ChatGPT via Codex CLI, date: 2025-11-10
Scope: Implemented AttemptsController with POST /attempts and GET /attempts (Bearer auth) for Question Service.
Author review: Validated JWT user extraction (sub/user_id) and basic input handling.
*/
import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AttemptsService, QuestionAttemptDoc } from './attempts.service';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';

type CreateAttemptBody = {
  question_id: string | number;
  status?: string;
  started_at?: string; // ISO
  submitted_at?: string; // ISO
  question?: Record<string, any> | null;
};

@Controller('attempts')
@UseGuards(BearerAuthGuard)
export class AttemptsController {
  constructor(private readonly svc: AttemptsService) {}

  @Post()
  async create(@Body() body: CreateAttemptBody, @Req() req: any) {
    const user = req.user || {};
    const userId: string | undefined = (user.sub as string) || (user.user_id as string);

    // minimal validation
    if (!userId) {
      throw new Error('Invalid user in token');
    }
    if (!body || body.question_id === undefined || body.question_id === null) {
      throw new Error('Missing question_id');
    }

    const toDoc: QuestionAttemptDoc = {
      user_id: userId,
      question_id: String(body.question_id),
      status: body.status || 'left',
      started_at: body.started_at ? new Date(body.started_at) : new Date(),
      submitted_at: body.submitted_at ? new Date(body.submitted_at) : new Date(),
      question: body.question ?? null,
      created_at: new Date(),
    };

    const res = await this.svc.create(toDoc);
    return { id: res.insertedId, ...toDoc };
  }

  @Get()
  async list(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const user = req.user || {};
    const userId: string | undefined = (user.sub as string) || (user.user_id as string);
    if (!userId) throw new Error('Invalid user in token');
    const p = Number(page) || 1;
    const s = Number(pageSize) || 20;
    return this.svc.listByUser(userId, { page: p, pageSize: s });
  }
}
