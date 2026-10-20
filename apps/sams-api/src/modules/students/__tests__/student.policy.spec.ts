import { AuthPrincipal } from '@aps-sams/auth';
import { assertStudentAdministrator, assertEnrollmentTransition } from '../student.policy';

const principal: AuthPrincipal = {
  userId: 'user', schoolId: 'school', membershipId: 'membership', sessionId: 'session',
  scope: 'sams', roles: ['registrar'], tokenId: 'token'
};

describe('student administration policy', () => {
  it.each(['admin', 'registrar'])('allows %s with a SAMS principal', role => {
    expect(() => assertStudentAdministrator({ ...principal, roles: [role] })).not.toThrow();
  });
  it.each(['student', 'teacher', 'finance', 'hr', 'leadership'])('denies %s mutation', role => {
    expect(() => assertStudentAdministrator({ ...principal, roles: [role] })).toThrow('Permission denied');
  });
  it('rejects APS-scoped identity even with an administrative role', () => {
    expect(() => assertStudentAdministrator({ ...principal, scope: 'aps' })).toThrow('Permission denied');
  });
  it.each([
    ['pending', 'active'], ['pending', 'cancelled'], ['active', 'withdrawn'],
    ['active', 'transferred'], ['active', 'completed']
  ])('allows %s -> %s', (from, to) => {
    expect(() => assertEnrollmentTransition(from, to)).not.toThrow();
  });
  it.each([
    ['withdrawn', 'active'], ['completed', 'active'], ['cancelled', 'active'],
    ['transferred', 'active'], ['active', 'pending'], ['pending', 'completed'],
    ['active', 'active'], ['unknown', 'active']
  ])('rejects %s -> %s and requires a new enrollment for reentry', (from, to) => {
    expect(() => assertEnrollmentTransition(from, to)).toThrow('Enrollment status cannot change');
  });
});
