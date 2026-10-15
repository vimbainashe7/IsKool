import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';
import { RequestContextInterceptor } from '../common/interceptors/request-context.interceptor';
import { JsonLogger } from '../common/logging/logger.service';
import { AppModule } from '../app.module';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(app.get(RequestContextInterceptor));
  app.useLogger(app.get(JsonLogger));
  await app.init();
  return app;
}
