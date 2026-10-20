import { Prisma } from '@prisma/client';
import { ClassAccessRepository } from '../class-access.repository';
describe('class access database failure boundary', () => {
  it.each(['P2028', 'P2024'])(
    'maps %s to a safe retryable dependency response without exposing provider details',
    async (code) => {
      const failure = new Prisma.PrismaClientKnownRequestError(
        'private provider details',
        { code, clientVersion: '5.22.0' }
      );
      const repo = new ClassAccessRepository({
        runWithPrincipal: jest.fn().mockRejectedValue(failure)
      } as never);
      await expect(
        repo.run({ schoolId: 'school' } as never, 'request', async () => null)
      ).rejects.toMatchObject({
        code: 'SCHOOL_RECORDS_UNAVAILABLE',
        status: 503
      });
    }
  );
  it('preserves unexpected failures rather than presenting an empty successful read', async () => {
    const failure = new Error('unexpected');
    const repo = new ClassAccessRepository({
      runWithPrincipal: jest.fn().mockRejectedValue(failure)
    } as never);
    await expect(
      repo.run({ schoolId: 'school' } as never, 'request', async () => null)
    ).rejects.toBe(failure);
  });
});
