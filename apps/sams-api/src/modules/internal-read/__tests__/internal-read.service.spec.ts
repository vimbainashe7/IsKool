import { InternalReadService } from '../internal-read.service';
import { AuthPrincipal } from '@aps-sams/auth';
const p = {
  userId: 'a2000000-0000-4000-8000-000000000004',
  schoolId: 'a1000000-0000-4000-8000-000000000001',
  membershipId: 'a3000000-0000-4000-8000-000000000004',
  sessionId: 'session',
  tokenId: 'token',
  scope: 'aps',
  roles: ['student']
} as AuthPrincipal;
function setup() {
  const records = {
    run: jest.fn(async (_p, _r, fn) => fn({})),
    ownProfile: jest.fn().mockResolvedValue(null),
    context: jest.fn().mockResolvedValue({
      asOf: new Date('2026-10-20T12:00:00Z'),
      authorized: true,
      totalClasses: 0,
      classes: []
    }),
    profile: jest.fn().mockResolvedValue(null),
    enrollments: jest.fn().mockResolvedValue([]),
    teaching: jest.fn().mockResolvedValue(null)
  };
  return { records, service: new InternalReadService(records as never) };
}
describe('authorized internal school reads', () => {
  it('does not present a membership disabled during the request as a genuine zero', async () => {
    const { service, records } = setup();
    records.context.mockResolvedValueOnce({
      authorized: false,
      asOf: new Date(),
      totalClasses: 0,
      classes: []
    });
    await expect(
      service.context(p, 'request', { role: 'student', limit: 25 })
    ).rejects.toMatchObject({ status: 401 });
  });
  it('binds a genuine empty context to the verified principal and requested allowed role', async () => {
    const { service, records } = setup();
    const result = await service.context(p, 'request', {
      role: 'student',
      limit: 25
    });
    expect(result).toEqual({
      version: 1,
      schoolId: p.schoolId,
      membershipId: p.membershipId,
      role: 'student',
      asOf: '2026-10-20T12:00:00.000Z',
      student: null,
      classes: [],
      totalClasses: 0,
      nextCursor: null
    });
    expect(records.run).toHaveBeenCalledWith(
      p,
      'request',
      expect.any(Function)
    );
  });
  it('rejects wrong scopes and role escalation before querying school data', async () => {
    const { service, records } = setup();
    await expect(
      service.context(p, 'request', { role: 'teacher', limit: 25 })
    ).rejects.toThrow();
    await expect(
      service.context({ ...p, scope: 'sams' }, 'request', {
        role: 'student',
        limit: 25
      })
    ).rejects.toThrow();
    expect(records.run).not.toHaveBeenCalled();
  });
  it('returns the same inaccessible-resource error for absent or foreign student/class records', async () => {
    const { service } = setup();
    await expect(service.profile(p, 'request', 'foreign')).rejects.toThrow(
      'not found'
    );
    await expect(
      service.classMembership(p, 'request', 'foreign-class', 'foreign-student')
    ).rejects.toThrow('not found');
    await expect(
      service.teachingAuthority(
        { ...p, roles: ['teacher'] },
        'request',
        'other-class'
      )
    ).rejects.toThrow('not found');
  });
  it('does not convert database failures into an empty successful context', async () => {
    const { service, records } = setup();
    records.context.mockRejectedValueOnce(new Error('dependency unavailable'));
    await expect(
      service.context(p, 'request', { role: 'student', limit: 25 })
    ).rejects.toThrow('dependency unavailable');
  });
});
