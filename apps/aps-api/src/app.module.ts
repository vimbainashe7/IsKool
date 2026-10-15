import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './config/app.config';
import { authConfig } from './config/auth.config';
import { databaseConfig } from './config/database.config';
import { envValidationSchema } from './config/env.validation';
import { redisConfig } from './config/redis.config';
import { samsInternalConfig } from './config/sams-internal.config';
import { storageConfig } from './config/storage.config';
import { PrismaModule } from './database/prisma.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { TelemetryModule } from './infrastructure/telemetry/telemetry.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { FoundationModule } from './modules/foundation/foundation.module';
import { HealthModule } from './modules/health/health.module';
import { JsonLogger } from './common/logging/logger.service';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor';

const redisEnabled = process.env.REDIS_ENABLED !== 'false';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, authConfig, databaseConfig, redisConfig, samsInternalConfig, storageConfig],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false }
    }),
    PrismaModule,
    ...(redisEnabled ? [RedisModule] : []),
    ...(process.env.NODE_ENV === 'test' || !redisEnabled ? [] : [QueueModule]),
    StorageModule,
    TelemetryModule,
    AuthModule,
    AuditModule,
    HealthModule,
    FoundationModule
  ],
  providers: [JsonLogger, RequestContextInterceptor],
  exports: [JsonLogger, RequestContextInterceptor]
})
export class AppModule {}
