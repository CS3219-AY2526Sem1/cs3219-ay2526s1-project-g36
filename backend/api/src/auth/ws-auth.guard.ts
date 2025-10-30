import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from './jwt.service';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();

    const token = client.handshake.auth?.token;

    if (!token) {
      throw new UnauthorizedException();
    }

    const payload = await this.jwt.verifyToken(token);
    client.data.user = payload.sub;
    return true;
  }
}