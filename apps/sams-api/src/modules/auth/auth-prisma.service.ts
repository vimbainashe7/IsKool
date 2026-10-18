import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { authConfig } from '../../config/auth.config';

@Injectable()
export class AuthPrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(authConfig.KEY) config: ConfigType<typeof authConfig>) {
    const hostedDevelopment = process.env.NODE_ENV === 'development' &&
      ['development', 'staging', 'testing'].includes(process.env.ISKOOL_ENVIRONMENT ?? '');
    super({
      datasources: {
        db: {
          url: config.authDatabaseUrl
        }
      },
      // Hosted development refresh rotation crosses several pooler round trips.
      // Keep the row lock/atomic transaction; production retains Prisma defaults.
      ...(hostedDevelopment ? { transactionOptions: { maxWait: 10000, timeout: 20000 } } : {})
    });
  }

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    await this.$disconnect();
  }
}
