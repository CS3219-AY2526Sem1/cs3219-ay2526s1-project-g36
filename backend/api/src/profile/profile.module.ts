import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';
import { JwtService } from '../auth/jwt.service';

@Module({
  controllers: [ProfileController],
  providers: [BearerAuthGuard, JwtService],
  exports: [BearerAuthGuard, JwtService],
})
export class AuthModule {}