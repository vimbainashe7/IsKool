import { PrismaClient } from '@prisma/client';
import { AuthPrismaService } from '../auth-prisma.service';
import { authConfig } from '../../../config/auth.config';

jest.mock('@prisma/client', () => ({ PrismaClient: jest.fn() }));

describe('auth database transaction configuration', () => {
  const original = { ...process.env };
  afterEach(() => { process.env = { ...original }; jest.clearAllMocks(); });
  const config = { authDatabaseUrl: 'postgresql://fixture@localhost/fixture' } as ReturnType<typeof authConfig>;

  it('allows a bounded pooler round-trip budget only in explicitly identified development', () => {
    process.env.NODE_ENV = 'development';
    process.env.ISKOOL_ENVIRONMENT = 'development';
    new AuthPrismaService(config);
    expect(PrismaClient).toHaveBeenCalledWith(expect.objectContaining({
      transactionOptions: { maxWait: 10000, timeout: 20000 }
    }));
  });

  it.each([
    ['production', 'development'], ['development', 'production'], ['development', ''], ['test', 'testing']
  ])('preserves default transaction limits for NODE_ENV=%s and ISKOOL_ENVIRONMENT=%s', (node, environment) => {
    process.env.NODE_ENV = node;
    process.env.ISKOOL_ENVIRONMENT = environment;
    new AuthPrismaService(config);
    expect(PrismaClient).toHaveBeenCalledWith({ datasources: { db: { url: config.authDatabaseUrl } } });
  });
});
