import { Module } from '@nestjs/common';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { MongoModule } from '../mongodb/mongo.module';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';
import { JwtService } from '../auth/jwt.service';

@Module({
  imports: [MongoModule],
  controllers: [QuestionsController],
  providers: [QuestionsService, BearerAuthGuard, JwtService],
})
export class QuestionsModule {}

