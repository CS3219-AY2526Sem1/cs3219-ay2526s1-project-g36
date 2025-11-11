/*
AI Assistance Disclosure:
Tool: OpenAI ChatGPT via Codex CLI, date: 2025-11-10
Scope: Implemented public health endpoints (/healthz, /health) with MongoDB ping.
Author review: Checked response shape and error handling; left unauthenticated by design.
*/
import { Controller, Get } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Db } from 'mongodb';
import { MONGO_DB } from '../mongodb/mongo.provider';

@Controller()
export class HealthController {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  @Get(['/healthz', '/health'])
  async health() {
    let mongo: { status: 'ok' | 'error'; error?: string } = { status: 'ok' };
    try {
      // ping the database to verify connectivity
      await this.db.command({ ping: 1 });
    } catch (e: any) {
      mongo = { status: 'error', error: e?.message || String(e) };
    }

    return {
      status: mongo.status === 'ok' ? 'ok' : 'degraded',
      uptime: process.uptime(),
      service: 'QuestionService',
      mongo,
      timestamp: new Date().toISOString(),
    };
  }
}
