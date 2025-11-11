import { Injectable, UnauthorizedException } from '@nestjs/common';

type Jose = typeof import('jose');
let _jose: Jose | null = null;
async function jose(): Promise<Jose> {
  if (_jose) return _jose;
  _jose = await import('jose');
  return _jose;
}

@Injectable()
export class JwtService {
  private secretKey = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);
  private audience = process.env.SUPABASE_JWT_AUD;
  private issuer = process.env.SUPABASE_ISS;

  async verifyToken(token: string) {
    try {
      const { jwtVerify } = await jose();
      const { payload } = await jwtVerify(token, this.secretKey, {
        algorithms: ['HS256'],
        audience: this.audience,
        issuer: this.issuer,
      });
      return payload as import('jose').JWTPayload;
    } catch (err: any) {
      throw new UnauthorizedException(`Token verification failed: ${err?.message ?? err}`);
    }
  }
}

