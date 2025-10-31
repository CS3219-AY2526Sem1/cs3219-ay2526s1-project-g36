import { Injectable, UnauthorizedException } from '@nestjs/common';
//import { jwtVerify, JWTPayload } from 'jose';

type Jose = typeof import('jose');
let _jose: Jose | null = null;
async function jose(): Promise<Jose> {
  if (_jose) return _jose;
  _jose = await import('jose'); // ESM import works from CJS output
  return _jose;
}


@Injectable()
export class JwtService {
  private secretKey = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);
  private audience = process.env.SUPABASE_JWT_AUD;
  private issuer = process.env.SUPABASE_ISS; // optional

  /* 
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
    */

  async verifyToken(token: string) {
    try {
      const { jwtVerify } = await jose();
      //const { JWTPayload } = await jose(); // only for typing if you need it at runtime; otherwise use TS type import below

      // If you want the return type strong-typed without loading symbols at runtime:
      // import type { JWTPayload } from 'jose';

      const { payload } = await jwtVerify(token, this.secretKey, {
        algorithms: ['HS256'],
        audience: this.audience,
        issuer: this.issuer,
      });

      return payload as import('jose').JWTPayload;
    } catch (err: any) {
      throw new UnauthorizedException(
        `Token verification failed: ${err?.message ?? err}`
      );
    }
  }
}
