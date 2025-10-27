import { Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtVerify, JWTPayload } from 'jose';

@Injectable()
export class JwtService {
  private secretKey = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);
  private audience = process.env.SUPABASE_JWT_AUD;
  private issuer = process.env.SUPABASE_ISS; // optional

  async verifyToken(token: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, this.secretKey, {
        algorithms: ['HS256'],
        audience: this.audience,         // ensure token.aud matches
        issuer: this.issuer,             // optional: ensure token.iss matches
      });
      return payload;
    } catch (err: any) {
      throw new UnauthorizedException(`Token verification failed: ${err?.message ?? err}`);
    }
  }
}
