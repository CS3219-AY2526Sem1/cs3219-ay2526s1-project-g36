import { Module } from '@nestjs/common';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { MongoModule } from 'src/mongodb/mongo.module';
import { ProfileModule } from 'src/profile/profile.module';

@Module({
  imports: [
    ProfileModule,
    MongoModule,
  ],
  controllers: [QuestionsController],
  providers: [QuestionsService],
})
export class QuestionsModule {}