import { Inject, Injectable, Optional } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../../database/prisma.service';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.module';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis?: Redis
  ) {}

  live(): { status: 'ok'; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  async ready(): Promise<{ status: 'ok' | 'degraded'; dependencies: Record<string, string>; timestamp: string }> {
    const dependencies: Record<string, string> = {};

    if (process.env.NODE_ENV === 'test') {
      return {
        status: 'ok',
        dependencies: { database: 'skipped', redis: 'skipped' },
        timestamp: new Date().toISOString()
      };
    }

    try {
      await this.withTimeout(this.prisma.$queryRaw`SELECT 1`);
      dependencies.database = 'ok';
    } catch {
      dependencies.database = 'unavailable';
    }

    if (process.env.REDIS_ENABLED === 'false') {
      dependencies.redis = 'disabled';
    } else {
      try {
        const pong = await this.withTimeout(this.redis?.ping() ?? Promise.reject(new Error('Redis client unavailable')));
        dependencies.redis = pong === 'PONG' ? 'ok' : 'unavailable';
      } catch {
        dependencies.redis = 'unavailable';
      }
    }

    const status = Object.values(dependencies).every((value) => value === 'ok' || value === 'disabled')
      ? 'ok'
      : 'degraded';
    return { status, dependencies, timestamp: new Date().toISOString() };
  }

  private async withTimeout<T>(operation: Promise<T>, timeoutMs = 500): Promise<T> {
    let timeout: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        operation,
        new Promise<T>((_resolve, reject) => {
          timeout = setTimeout(() => reject(new Error('health dependency timeout')), timeoutMs);
        })
      ]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }
}
