/*
AI Assistance Disclosure:
Tool: OpenAI ChatGPT via Codex CLI, date: 2025-11-10
Scope: Extended search to include topics/data structures/tags/category with partial, case-insensitive matching.
Author review: Preserved existing filters and aggregation; acknowledged regex trade-offs.
*/
import { Inject, Injectable } from '@nestjs/common';
import { Collection, Document, Filter } from 'mongodb';
import { MONGO_COLLECTION } from '../mongodb/mongo.provider';

/**
 * Service to handle question-related operations, such as fetching top questions from the MongoDB database.
 */
@Injectable()
export class QuestionsService {
  constructor(@Inject(MONGO_COLLECTION) private readonly collection: Collection) {}

  // this function fetches the top 'limit' questions from the 'questions' collection in the MongoDB database
  findTop(limit = 5) {
    return this.collection
      .find({})
      .limit(limit)
      .toArray()
      .then((items) => items.map((i) => this.addPoints(i)));
  }

  private addPoints<T extends Record<string, any>>(doc: T): T & { points: number } {
    const d = String(doc?.difficulty || '').toLowerCase();
    let points = 0;
    if (d === 'easy') points = 1;
    else if (d === 'medium') points = 3;
    else if (d === 'hard') points = 5;
    return { ...(doc as any), points };
  }

  async findByIdExact(id: number) {
    const doc = await this.collection.findOne({ id });
    return doc ? this.addPoints(doc as any) : null;
  }

  /**
   * Search with optional related topic filter, difficulty filter, search, sorting and pagination.
   */
  async search({
    topic,
    difficulty,
    sortBy,
    sortDir,
    q,
    page = 1,
    pageSize = 20,
  }: {
    topic?: string;
    difficulty?: string;
    sortBy?: string;
    sortDir?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }) {
    const match: any = {};

    // Topic filter (supports comma-separated string field or array field)
    if (topic && topic.trim().length > 0) {
      const esc = topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(^|,)\\s*${esc}\\s*(,|$)`, 'i');
      const reExact = new RegExp(`^${esc}$`, 'i');
      match.$or = [
        { related_topics: { $regex: re } },
        { related_topics: { $elemMatch: { $regex: reExact } } },
      ];
    }

    // Difficulty filter (single value, case-insensitive match to one of Easy/Medium/Hard)
    if (difficulty && difficulty.trim()) {
      const d = difficulty.trim().toLowerCase();
      const difficulties = ['easy', 'medium', 'hard'];
      if (difficulties.includes(d)) {
        match.difficulty = { $regex: new RegExp(`^${d}$`, 'i') };
      }
    }

    // Search by keyword: title OR id OR topics/data structures/tags/category (partial, case-insensitive)
    if (q && q.length > 0) {
      const escQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const titleRe = new RegExp(escQ); // case-sensitive, partial for title
      const topicRe = new RegExp(escQ, 'i'); // case-insensitive for topical fields
      const orConds = [
        { title: { $regex: titleRe } } as any,
        // allow id partial match via $toString in $expr
        { $expr: { $regexMatch: { input: { $toString: '$id' }, regex: escQ } } },
        // match related_topics as string or array
        { related_topics: { $regex: topicRe } } as any,
        { related_topics: { $elemMatch: { $regex: topicRe } } } as any,
        // match topic/category direct string fields
        { topic: { $regex: topicRe } } as any,
        { category: { $regex: topicRe } } as any,
        // match data structures & tags if present (string or array)
        { dataStructures: { $regex: topicRe } } as any,
        { dataStructures: { $elemMatch: { $regex: topicRe } } } as any,
        { tags: { $regex: topicRe } } as any,
        { tags: { $elemMatch: { $regex: topicRe } } } as any,
      ];
      if (match.$or) {
        // If a topic filter already exists, combine with OR across q terms (AND between filters)
        match.$and = [{ $or: match.$or }, { $or: orConds }];
        delete match.$or;
      } else {
        match.$or = orConds;
      }
    }

    // Sorting
    const sortMap: Record<string, string> = {
      title: 'title',
      topic: 'related_topics',
      related_topics: 'related_topics',
      difficulty: 'difficulty',
      popularity: 'likes',
      likes: 'likes',
      discuss_count: 'discuss_count',
      solve_rate: 'acceptance_rate',
      solverate: 'acceptance_rate',
      acceptance_rate: 'acceptance_rate',
      frequency: 'frequency',
      rating: 'rating',
      id: 'id',
    };
    const field = sortBy ? sortMap[sortBy.toLowerCase()] ?? 'title' : 'title';
    const dir = (sortDir || 'asc').toLowerCase() === 'desc' ? -1 : 1;

    const skip = Math.max(0, (page - 1) * pageSize);

    // Build aggregation pipeline to support $expr and difficulty rank sort if requested
    const pipeline: any[] = [{ $match: match }];

    if (field === 'difficulty') {
      pipeline.push({
        $addFields: {
          _difficulty_rank: {
            $switch: {
              branches: [
                { case: { $regexMatch: { input: '$difficulty', regex: /^easy$/i } }, then: 1 },
                { case: { $regexMatch: { input: '$difficulty', regex: /^medium$/i } }, then: 2 },
                { case: { $regexMatch: { input: '$difficulty', regex: /^hard$/i } }, then: 3 },
              ],
              default: 9,
            },
          },
        },
      });
      pipeline.push({ $sort: { _difficulty_rank: dir, title: 1 } });
      pipeline.push({ $project: { _difficulty_rank: 0 } });
    } else {
      pipeline.push({ $sort: { [field]: dir, title: 1 } });
    }

    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: pageSize });

    const [total, rawItems] = await Promise.all([
      this.collection.countDocuments(match as Filter<Document>),
      this.collection.aggregate(pipeline).toArray(),
    ]);

    const items = rawItems.map((i) => this.addPoints(i));
    return { items, total, page, pageSize };
  }
}
