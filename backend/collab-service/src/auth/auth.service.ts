import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

export type SessionUser = { userId: string };

@Injectable()
export class AuthService {
  constructor(private readonly cfg: ConfigService) {}

  verify(token?: string): SessionUser {
    if (!token) throw new UnauthorizedException('Missing token');

    const secret = this.cfg.get<string>('SUPABASE_JWT_SECRET');

    if (!secret) {
      if (token === 'dev-test-token') return { userId: 'test-user' };

      const decoded = jwt.decode(token) as JwtPayload | null;
      if (!decoded?.sub)
        throw new UnauthorizedException('Invalid token (no sub claim)');
      return { userId: decoded.sub };
    }

    try {
      const decoded = jwt.verify(token, secret, {
        algorithms: ['HS256'],
      }) as JwtPayload;

      if (!decoded?.sub)
        throw new UnauthorizedException('Token has no sub claim');

      return { userId: decoded.sub };
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
