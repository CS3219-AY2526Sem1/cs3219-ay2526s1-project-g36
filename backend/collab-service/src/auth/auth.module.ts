import { Module } from '@nestjs/common';
import { JwtService } from '../../../api/src/auth/jwt.service';
import { WsAuthGuard } from '../../../api/src/auth/ws-auth.guard';

@Module({
  providers: [JwtService, WsAuthGuard],
  exports: [JwtService, WsAuthGuard],
})
export class AuthModule {}
