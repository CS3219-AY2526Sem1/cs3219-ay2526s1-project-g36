"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const config_1 = require("@nestjs/config");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const config = app.get(config_1.ConfigService);
    const origins = (config.get('CORS_ORIGINS') || '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
    app.enableCors({
        origin: origins.length ? origins : true,
        credentials: true,
    });
    const port = Number(config.get('PORT')) || 3000;
    await app.listen(port);
    console.log(`QN service is running on: http://localhost:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map