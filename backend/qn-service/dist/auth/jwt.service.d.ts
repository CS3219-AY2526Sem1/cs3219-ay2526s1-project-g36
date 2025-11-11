export declare class JwtService {
    private secretKey;
    private audience;
    private issuer;
    verifyToken(token: string): Promise<import("jose", { with: { "resolution-mode": "import" } }).JWTPayload>;
}
