import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  // Disable ETag to avoid 304 caching confusing development responses
  const http = app.getHttpAdapter()?.getInstance?.();
  if (http?.disable) {
    http.disable('etag');
  }

  const origins = (config.get<string>('CORS_ORIGINS') || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins.length ? origins : true,
    credentials: true,
  });

  const port = Number(config.get<number>('PORT')) || 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`QN service is running on: http://localhost:${port}`);
}

bootstrap();
