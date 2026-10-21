import { AuthPrincipal } from '@aps-sams/auth';
import { ContextQuery } from '@aps-sams/sams-contracts';
import { AcademicContextService } from '../academic-context.service';
const principal: AuthPrincipal = {
  userId: 'u',
  membershipId: 'm',
  schoolId: 's',
  sessionId: 'x',
  tokenId: 'token',
  roles: ['student'],
  scope: 'aps'
};
describe('APS academic context policy', () => {
  const client = { getAuthorizedContext: jest.fn() };
  const service = new AcademicContextService(client as never);
  beforeEach(() => {
    jest.resetAllMocks();
  });
  it('rejects wrong scope and unauthorized roles before crossing the boundary', async () => {
    for (const actor of [
      { ...principal, scope: 'sams' as const },
      { ...principal, roles: ['admin'] },
      { ...principal, roles: ['teacher'] }
    ])
      await expect(
        service.read(
          actor,
          'r',
          't',
          Object.assign(new ContextQuery(), { role: 'student' })
        )
      ).rejects.toMatchObject({ status: 403 });
    expect(client.getAuthorizedContext).not.toHaveBeenCalled();
  });
  it('keeps a dependency failure as an error instead of a zero', async () => {
    client.getAuthorizedContext.mockRejectedValue(new Error('dependency'));
    await expect(
      service.read(
        principal,
        'r',
        't',
        Object.assign(new ContextQuery(), { role: 'student' })
      )
    ).rejects.toThrow('dependency');
  });
  it('passes the verified actor and correlation ID and preserves a genuine zero', async () => {
    client.getAuthorizedContext.mockResolvedValue({
      classes: [],
      totalClasses: 0
    });
    const q = Object.assign(new ContextQuery(), { role: 'student' });
    await expect(service.read(principal, 'r', 't', q)).resolves.toEqual({
      classes: [],
      totalClasses: 0
    });
    expect(client.getAuthorizedContext).toHaveBeenCalledWith(
      { principal, token: 't', requestId: 'r' },
      q
    );
  });
  it('makes inaccessible class details a 404 and rejects conflicting pagination', async () => {
    client.getAuthorizedContext.mockResolvedValue({ classes: [] });
    const q = Object.assign(new ContextQuery(), {
      role: 'student',
      classId: 'c'
    });
    await expect(service.read(principal, 'r', 't', q)).rejects.toMatchObject({
      status: 404
    });
    await expect(
      service.read(principal, 'r', 't', { ...q, cursor: 'p' })
    ).rejects.toMatchObject({ status: 422 });
    expect(client.getAuthorizedContext).toHaveBeenCalledTimes(1);
  });
});
