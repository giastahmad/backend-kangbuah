// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import * as admin from 'firebase-admin';

async function bootstrap() {
  
  const serviceAccount = require('../serviceAccountKey.json');

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new ResponseInterceptor());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();