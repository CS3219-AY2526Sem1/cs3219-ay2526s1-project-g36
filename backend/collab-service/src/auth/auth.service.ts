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
      throw new UnauthorizedException('JWT secret not configured');
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
