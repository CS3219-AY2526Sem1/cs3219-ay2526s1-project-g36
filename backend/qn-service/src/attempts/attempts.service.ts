/*
AI Assistance Disclosure:
Tool: OpenAI ChatGPT via Codex CLI, date: 2025-11-10
Scope: Implemented AttemptsService for creating and listing user question attempts (MongoDB collection binding).
Author review: Reviewed types, ensured env-based collection naming and pagination limits.
*/
import { Inject, Injectable } from '@nestjs/common';
import { Collection, Db, InsertOneResult } from 'mongodb';
import { MONGO_DB } from '../mongodb/mongo.provider';

export type QuestionAttemptDoc = {
  user_id: string;
  question_id: string;
  status?: string; // e.g. 'completed' | 'left'
  started_at: Date;
  submitted_at?: Date | null;
  question?: Record<string, any> | null; // snapshot of question metadata
  created_at: Date;
};

@Injectable()
export class AttemptsService {
  private collection: Collection<QuestionAttemptDoc>;

  constructor(@Inject(MONGO_DB) private readonly db: Db) {
    const name = process.env.ATTEMPTS_COLLECTION_NAME || process.env.MONGODB_ATTEMPTS_COLLECTION || 'QuestionAttempts';
    this.collection = this.db.collection<QuestionAttemptDoc>(name);
  }

  async create(doc: QuestionAttemptDoc): Promise<InsertOneResult<QuestionAttemptDoc>> {
    return this.collection.insertOne(doc);
  }

  async listByUser(userId: string, options?: { page?: number; pageSize?: number }) {
    const page = Math.max(1, options?.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, options?.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const [total, items] = await Promise.all([
      this.collection.countDocuments({ user_id: userId }),
      this.collection
        .find({ user_id: userId })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray(),
    ]);

    return { total, page, pageSize, items };
  }
}
