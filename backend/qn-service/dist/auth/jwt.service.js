"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtService = void 0;
const common_1 = require("@nestjs/common");
let _jose = null;
async function jose() {
    if (_jose)
        return _jose;
    _jose = await import('jose');
    return _jose;
}
let JwtService = class JwtService {
    secretKey = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);
    audience = process.env.SUPABASE_JWT_AUD;
    issuer = process.env.SUPABASE_ISS;
    async verifyToken(token) {
        try {
            const { jwtVerify } = await jose();
            const { payload } = await jwtVerify(token, this.secretKey, {
                algorithms: ['HS256'],
                audience: this.audience,
                issuer: this.issuer,
            });
            return payload;
        }
        catch (err) {
            throw new common_1.UnauthorizedException(`Token verification failed: ${err?.message ?? err}`);
        }
    }
};
exports.JwtService = JwtService;
exports.JwtService = JwtService = __decorate([
    (0, common_1.Injectable)()
], JwtService);
//# sourceMappingURL=jwt.service.js.map