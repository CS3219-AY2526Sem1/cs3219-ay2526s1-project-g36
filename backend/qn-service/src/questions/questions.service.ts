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
    return this.collection.find({}).limit(limit).toArray();
  }

  /**
   * Search with optional related topic filter and pagination.
   */
  async search({ topic, page = 1, pageSize = 20 }: { topic?: string; page?: number; pageSize?: number }) {
    const filter: Filter<Document> = {};

    if (topic && topic.trim().length > 0) {
      const esc = topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match either comma/edge-delimited substring in a string field, or exact (case-insensitive) element in an array field
      const re = new RegExp(`(^|,)\\s*${esc}\\s*(,|$)`, 'i');
      const reExact = new RegExp(`^${esc}$`, 'i');
      Object.assign(filter, {
        $or: [
          { related_topics: { $regex: re } },
          { related_topics: { $elemMatch: { $regex: reExact } } },
        ],
      });
    }

    const skip = Math.max(0, (page - 1) * pageSize);
    const [total, items] = await Promise.all([
      this.collection.countDocuments(filter),
      this.collection.find(filter).skip(skip).limit(pageSize).toArray(),
    ]);

    return { items, total, page, pageSize };
  }
}
