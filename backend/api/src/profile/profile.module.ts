import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';
import { JwtService } from '../auth/jwt.service';
import { ProfileService } from './profile.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [ PrismaModule],
  controllers: [ProfileController],
  providers: [BearerAuthGuard, JwtService, ProfileService],
  exports: [BearerAuthGuard, JwtService],
})
export class ProfileModule {}