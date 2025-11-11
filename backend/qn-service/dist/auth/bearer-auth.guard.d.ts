import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from './jwt.service';
export declare class BearerAuthGuard implements CanActivate {
    private readonly jwt;
    constructor(jwt: JwtService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
