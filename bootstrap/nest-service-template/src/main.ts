import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor';
import { JsonLogger } from './common/logging/logger.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const logger = app.get(JsonLogger);

  app.useLogger(logger);
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.enableCors({
    origin: config.getOrThrow<string[]>('app.allowedOrigins'),
    credentials: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(app.get(RequestContextInterceptor));
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle(`${config.getOrThrow<string>('app.serviceName')} API`)
      .setVersion('1.0')
      .addBearerAuth()
      .build()
  );
  SwaggerModule.setup('api/v1/docs', app, document);

  const port = config.getOrThrow<number>('app.port');
  await app.listen(port);
  logger.log(`Service started on port ${port} with prefix /api/v1`, 'bootstrap');
}

void bootstrap();
