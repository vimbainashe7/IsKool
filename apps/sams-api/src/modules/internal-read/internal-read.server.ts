import { INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
import { RequestContextInterceptor } from '../../common/interceptors/request-context.interceptor';
import { JsonLogger } from '../../common/logging/logger.service';
import { InternalReadController } from './internal-read.controller';
import { InternalReadGuard } from './internal-read.guard';
import { InternalReadService } from './internal-read.service';
import { InternalReadLifecycle } from './internal-read.module';
import { AuthRepository } from '../auth/auth.repository';
@Module({})
class PrivateReadApplication {}
export async function startInternalReads(
  main: INestApplication
): Promise<void> {
  const config = main.get(ConfigService);
  const enabled = config.get<boolean | string>('SAMS_INTERNAL_ENABLED');
  if (enabled !== true && enabled !== 'true') return;
  const host = config.get<string>('SAMS_INTERNAL_HOST') ?? '127.0.0.1';
  const network = config.get<boolean | string>('SAMS_INTERNAL_ALLOW_NETWORK');
  if (
    !['127.0.0.1', '::1'].includes(host) &&
    network !== true &&
    network !== 'true'
  )
    throw new Error(
      'Non-loopback internal reads require explicit private-network configuration.'
    );
  const logger = main.get(JsonLogger);
  const server = await NestFactory.create(
    {
      module: PrivateReadApplication,
      controllers: [InternalReadController],
      providers: [
        { provide: ConfigService, useValue: config },
        { provide: AuthRepository, useValue: main.get(AuthRepository) },
        { provide: InternalReadGuard, useValue: main.get(InternalReadGuard) },
        {
          provide: InternalReadService,
          useValue: main.get(InternalReadService)
        }
      ]
    },
    { logger, abortOnError: false }
  );
  server.setGlobalPrefix('internal/v1');
  server.use(helmet());
  server.use(
    (
      request: Request & { requestId?: string },
      response: Response,
      next: NextFunction
    ) => {
      const inbound = request.header('x-request-id');
      request.requestId =
        inbound && inbound.length <= 128 ? inbound : randomUUID();
      response.setHeader('x-request-id', request.requestId);
      response.setHeader('cache-control', 'private, no-store');
      next();
    }
  );
  server.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  server.useGlobalFilters(new GlobalExceptionFilter());
  server.useGlobalInterceptors(main.get(RequestContextInterceptor));
  await server.listen(config.get<number>('SAMS_INTERNAL_PORT') ?? 3003, host);
  main.get(InternalReadLifecycle).server = server;
  logger.log(
    'SAMS internal read listener ready; service and actor authentication required.',
    'internal-read'
  );
}
