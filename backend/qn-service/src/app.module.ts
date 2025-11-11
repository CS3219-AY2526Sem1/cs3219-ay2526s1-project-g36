/*
AI Assistance Disclosure:
Tool: OpenAI ChatGPT via Codex CLI, date: 2025-11-10
Scope: Added module imports (AttemptsModule, HealthModule) to AppModule.
Author review: Ensured ConfigModule remains global and imports order is valid.
*/
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QuestionsModule } from './questions/questions.module';
import { AttemptsModule } from './attempts/attempts.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    QuestionsModule,
    AttemptsModule,
    HealthModule,
  ],
})
export class AppModule {}
