import { Inject, Injectable } from '@nestjs/common';
import { Db } from 'mongodb';
import { MONGO_DB } from '../mongodb/mongo.provider';
import { PrismaService } from '../prisma/prisma.service';
import { getQuestionPointsFromQnService } from './utils/qn-service-client';

/**
 * Service to handle question-related operations, such as fetching top questions from the MongoDB database.
 */
@Injectable()
export class QuestionsService {
  constructor(
    @Inject(MONGO_DB) private readonly db: Db,
    private readonly prisma: PrismaService,
  ) {}

  // this function fetches the top 'limit' questions from the 'questions' collection in the MongoDB database
  findTop(limit = 5) {
    return this.db.collection('questions').find({}).limit(limit).toArray();
  }

  /**
   * Mark a question as completed and update user points.
   * TODO: Implement logic to update question status, fetch difficulty, and update points.
   */
  async completeQuestion(userId: string, questionId: string) {
    // 1. Update question status to 'completed' and set submitted_at in Postgres
    await this.prisma.question.update({
      where: {
        user_id_question_id: {
          user_id: userId,
          question_id: questionId,
        },
      },
      data: {
        status: 'completed',
        submitted_at: new Date(),
      },
    });

    // 2. Fetch points from qn-service
    const qnServiceUrl = process.env.QN_SERVICE_URL || 'http://localhost:3002';
    let points = 0;
    try {
      points = await getQuestionPointsFromQnService(qnServiceUrl, questionId);
    } catch (err) {
      // fallback: no points if qn-service fails
      points = 0;
    }

    // 3. Increment user's total_points
    await this.prisma.profile.update({
      where: { user_id: userId },
      data: { total_points: { increment: points } },
    });

    return { status: 'success', pointsAwarded: points };
  }
}