"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BearerAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_service_1 = require("./jwt.service");
let BearerAuthGuard = class BearerAuthGuard {
    jwt;
    constructor(jwt) {
        this.jwt = jwt;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const auth = request.headers['authorization'];
        const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
        if (!token) {
            throw new common_1.UnauthorizedException('No token provided');
        }
        const payload = await this.jwt.verifyToken(token);
        request.user = payload;
        return true;
    }
};
exports.BearerAuthGuard = BearerAuthGuard;
exports.BearerAuthGuard = BearerAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_service_1.JwtService])
], BearerAuthGuard);
//# sourceMappingURL=bearer-auth.guard.js.map