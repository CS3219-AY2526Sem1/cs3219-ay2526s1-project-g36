/*
AI Assistance Disclosure:
Tool: OpenAI ChatGPT via Codex CLI, date: 2025-11-10
Scope: Generated AttemptsModule wiring (imports/controllers/providers) for Question Service.
Author review: Verified NestJS module structure and provider wiring.
*/
import { Module } from '@nestjs/common';
import { MongoModule } from '../mongodb/mongo.module';
import { AttemptsService } from './attempts.service';
import { AttemptsController } from './attempts.controller';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';
import { JwtService } from '../auth/jwt.service';

@Module({
  imports: [MongoModule],
  controllers: [AttemptsController],
  providers: [AttemptsService, BearerAuthGuard, JwtService],
})
export class AttemptsModule {}
