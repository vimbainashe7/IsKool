import { AuthPrincipal } from '@aps-sams/auth';
import { ClassAccessService } from '../class-access.service';
const principal = {
  userId: 'user',
  membershipId: 'member',
  schoolId: 'school',
  scope: 'sams',
  roles: ['admin'],
  sessionId: 'session',
  tokenId: 'token'
} as AuthPrincipal;
function setup() {
  const tx = {
    student: {
      update: jest.fn().mockResolvedValue({
        id: 'student',
        membershipId: 'student-account',
        version: 2
      })
    },
    classTeacher: {
      create: jest.fn().mockResolvedValue({ version: 1 }),
      update: jest.fn().mockResolvedValue({ version: 2 })
    }
  };
  const records = {
    classes: jest.fn().mockResolvedValue([
      { id: 'class-1', name: 'Form 1', academicYearLabel: '2026' },
      { id: 'class-2', name: 'Form 2', academicYearLabel: '2026' }
    ]),
    run: jest.fn(async (_p, _r, fn) => fn(tx)),
    student: jest.fn().mockResolvedValue({
      id: 'student',
      schoolId: 'school',
      membershipId: null,
      status: 'active',
      version: 1
    }),
    eligible: jest.fn().mockResolvedValue(true),
    schoolClass: jest
      .fn()
      .mockResolvedValue({ id: 'class', academicYearId: 'year' }),
    assignment: jest.fn().mockResolvedValue({ version: 1, status: 'active' })
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  return {
    tx,
    records,
    audit,
    service: new ClassAccessService(records as never, audit as never)
  };
}
describe('SAMS account and teaching authority administration', () => {
  it('returns bounded class choices with their joined year label and next cursor', async () => {
    const { service } = setup();
    await expect(
      service.classes(principal, 'request', { limit: 1 })
    ).resolves.toEqual({
      items: [{ id: 'class-1', name: 'Form 1', academicYearLabel: '2026' }],
      nextCursor: 'class-1'
    });
  });
  it('denies teachers before accessing records', async () => {
    const { service, records } = setup();
    await expect(
      service.linkAccount(
        { ...principal, roles: ['teacher'] },
        'request',
        'student',
        { membershipId: 'student-account', version: 1 }
      )
    ).rejects.toThrow();
    expect(records.run).not.toHaveBeenCalled();
  });
  it('cannot link a foreign, archived, wrong-role or stale student account', async () => {
    const { service, records, tx } = setup();
    records.student.mockResolvedValueOnce(null);
    await expect(
      service.linkAccount(principal, 'request', 'foreign', {
        membershipId: 'student-account',
        version: 1
      })
    ).rejects.toThrow('not found');
    records.eligible.mockResolvedValueOnce(false);
    await expect(
      service.linkAccount(principal, 'request', 'student', {
        membershipId: 'wrong-role',
        version: 1
      })
    ).rejects.toThrow('Student');
    await expect(
      service.linkAccount(principal, 'request', 'student', {
        membershipId: 'student-account',
        version: 2
      })
    ).rejects.toThrow('Reload');
    records.student.mockResolvedValueOnce({
      id: 'student',
      schoolId: 'school',
      membershipId: null,
      status: 'archived',
      version: 1
    });
    await expect(
      service.linkAccount(principal, 'request', 'student', {
        membershipId: 'student-account',
        version: 1
      })
    ).rejects.toThrow('active student');
    expect(tx.student.update).not.toHaveBeenCalled();
  });
  it('binds the link to the principal school and audits it in the same transaction', async () => {
    const { service, records, tx, audit } = setup();
    await service.linkAccount(principal, 'request', 'student', {
      membershipId: 'student-account',
      version: 1
    });
    expect(records.run).toHaveBeenCalledTimes(1);
    expect(tx.student.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'student', schoolId: 'school', version: 1 },
        data: { membershipId: 'student-account', version: { increment: 1 } }
      })
    );
    expect(audit.record).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        schoolId: 'school',
        entityId: 'student',
        action: 'student.account_linked'
      })
    );
  });
  it('does not assign an unknown class or a non-Teacher account', async () => {
    const { service, records, tx } = setup();
    records.schoolClass.mockResolvedValueOnce(null);
    await expect(
      service.assignTeacher(principal, 'request', 'foreign', {
        membershipId: 'teacher'
      })
    ).rejects.toThrow('not found');
    records.eligible.mockResolvedValueOnce(false);
    await expect(
      service.assignTeacher(principal, 'request', 'class', {
        membershipId: 'student'
      })
    ).rejects.toThrow('Teacher');
    expect(tx.classTeacher.create).not.toHaveBeenCalled();
  });
  it('rejects stale authority changes and preserves the old assignment if audit fails', async () => {
    const { service, audit, tx } = setup();
    await expect(
      service.changeTeacher(principal, 'request', 'class', 'teacher', {
        status: 'revoked',
        version: 2
      })
    ).rejects.toThrow('Reload');
    expect(tx.classTeacher.update).not.toHaveBeenCalled();
    audit.record.mockRejectedValueOnce(new Error('audit unavailable'));
    await expect(
      service.changeTeacher(principal, 'request', 'class', 'teacher', {
        status: 'revoked',
        version: 1
      })
    ).rejects.toThrow('audit unavailable');
  });
});
