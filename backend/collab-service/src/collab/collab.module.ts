import { Module } from '@nestjs/common';
import { CollabGateway } from './collab.gateway';
import { CollabService } from './collab.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [CollabGateway, CollabService],
  exports: [CollabService],
})
export class CollabModule {}
