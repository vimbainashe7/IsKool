import { HealthService } from './health.service';

describe('HealthService', () => {
  it('reports Redis as disabled without degrading database readiness', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousRedisEnabled = process.env.REDIS_ENABLED;
    process.env.NODE_ENV = 'development';
    process.env.REDIS_ENABLED = 'false';

    const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const service = new HealthService(prisma as never, undefined as never);

    await expect(service.ready()).resolves.toEqual({
      status: 'ok',
      dependencies: { database: 'ok', redis: 'disabled' },
      timestamp: expect.any(String)
    });

    process.env.NODE_ENV = previousNodeEnv;
    if (previousRedisEnabled === undefined) delete process.env.REDIS_ENABLED;
    else process.env.REDIS_ENABLED = previousRedisEnabled;
  });
});
