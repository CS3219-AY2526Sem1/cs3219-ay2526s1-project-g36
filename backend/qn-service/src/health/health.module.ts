/*
AI Assistance Disclosure:
Tool: OpenAI ChatGPT via Codex CLI, date: 2025-11-10
Scope: Created HealthModule wiring for health controller.
Author review: Verified simple module export/import.
*/
import { Module } from '@nestjs/common';
import { MongoModule } from '../mongodb/mongo.module';
import { HealthController } from './health.controller';

@Module({
  imports: [MongoModule],
  controllers: [HealthController],
})
export class HealthModule {}
