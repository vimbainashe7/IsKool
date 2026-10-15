import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { JsonLogger } from './common/logging/logger.service';

async function bootstrapWorker(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { bufferLogs: true });
  const logger = app.get(JsonLogger);
  const config = app.get(ConfigService);
  app.useLogger(logger);
  app.enableShutdownHooks();
  logger.log(`Worker started for ${config.getOrThrow<string>('app.serviceName')}`, 'worker');
}

void bootstrapWorker();
