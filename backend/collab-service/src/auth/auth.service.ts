import { Injectable, UnauthorizedException } from '@nestjs/common';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

export type SessionUser = { userId: string };

@Injectable()
export class AuthService {
  constructor(private readonly cfg: ConfigService) {}

  /**
   * Verifies a Supabase/Auth access token (HS256 for MVP).
   * Returns the user identity from the `sub` claim.
   */
  verify(token?: string): SessionUser {
    if (!token) throw new UnauthorizedException('Missing token');

    const secret = this.cfg.get<string>('SUPABASE_JWT_SECRET');
    console.log('[Auth] SUPABASE_JWT_SECRET length:', secret?.length);
    if (!secret) {
      if (token === 'dev-test-token') {
        // Special bypass for local dev/testing without a real JWT
        return { userId: 'test-user' };
      }
      const decoded = jwt.decode(token) as JwtPayload | null;
      console.log('[Auth] Decoded token:', decoded);
      console.log('[Auth] Sub claim:', decoded?.sub);
      if (!decoded?.sub)
        throw new UnauthorizedException('Invalid token (no sub claim)');
      console.warn(
        '[AuthService] WARNING: using jwt.decode() fallback — no SUPABASE_JWT_SECRET configured',
      );
      return { userId: decoded.sub };
    }

    try {
      const full = jwt.decode(token, { complete: true }) as {
        header: any;
        payload: any;
      } | null;
      console.log(
        '[Auth] header.alg:',
        full?.header?.alg,
        'iss:',
        full?.payload?.iss,
        'sub:',
        full?.payload?.sub,
      );
      console.log('[Auth] About to verify with secret...');
      const decoded = jwt.verify(token, secret) as JwtPayload;
      console.log('[Auth] Token verified successfully, sub:', decoded.sub);
      const sub = decoded.sub as string | undefined;
      if (!sub) throw new Error('Token has no sub claim');
      return { userId: sub };
    } catch (error) {
      console.error('[AuthService] ===== ERROR VERIFYING TOKEN =====');
      console.error(
        '[AuthService] Error type:',
        (error as any).constructor.name,
      );
      console.error('[AuthService] Error message:', (error as Error).message);
      console.error('[AuthService] Full error:', error);
      throw new UnauthorizedException(error);
    }
  }
}
