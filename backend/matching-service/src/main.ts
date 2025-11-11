import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
   app.enableCors({
    origin: true,
    credentials: true,
  });
  const port = 3000;
  await app.listen(port);
  console.log(`Matching service is running on: http://localhost:${port}`);
}
bootstrap();
