import { AuthPrincipal } from './principal';
import {
  AuthorizationKernel,
  AuthorizationResourceMetadata,
  AuthorizationSubject,
  createAuthorizationLogEvent
} from './authorization';

const principal: AuthPrincipal = {
  userId: 'user-teacher-a',
  schoolId: 'school-a',
  membershipId: 'membership-a',
  sessionId: 'session-a',
  scope: 'aps',
  roles: ['teacher'],
  tokenId: 'token-a'
};

const activeSubject: AuthorizationSubject = {
  principal,
  membershipStatus: 'active'
};

const resource: AuthorizationResourceMetadata = {
  type: 'class',
  id: 'class-a',
  schoolId: 'school-a',
  ownerUserId: 'user-teacher-a'
};

describe('AuthorizationKernel', () => {
  const kernel = new AuthorizationKernel();

  it('allows a same-school active member with the required capability and ownership', () => {
    const decision = kernel.authorize({
      subject: activeSubject,
      action: 'class.read',
      resource,
      ownership: { ownerUserId: 'user-teacher-a' }
    });

    expect(decision).toEqual({ allowed: true });
  });

  it('denies cross-school resources before business action', () => {
    const decision = kernel.authorize({
      subject: activeSubject,
      action: 'class.read',
      resource: { ...resource, schoolId: 'school-b' }
    });

    expect(decision).toMatchObject({
      allowed: false,
      reason: 'RESOURCE_SCHOOL_MISMATCH',
      publicFailureMode: 'not_found'
    });
  });

  it('denies missing and inactive memberships', () => {
    expect(
      kernel.authorize({
        subject: { principal, membershipStatus: 'missing' },
        action: 'class.read',
        resource
      })
    ).toMatchObject({ allowed: false, reason: 'MEMBERSHIP_MISSING' });

    expect(
      kernel.authorize({
        subject: { principal, membershipStatus: 'inactive' },
        action: 'class.read',
        resource
      })
    ).toMatchObject({ allowed: false, reason: 'MEMBERSHIP_INACTIVE' });
  });

  it('denies when the required role or capability is missing', () => {
    const decision = kernel.authorize({
      subject: {
        principal: { ...principal, roles: ['student'] },
        membershipStatus: 'active'
      },
      action: 'grade.write',
      resource: { ...resource, type: 'grade', id: 'grade-a' }
    });

    expect(decision).toMatchObject({
      allowed: false,
      reason: 'CAPABILITY_MISSING',
      publicFailureMode: 'forbidden'
    });
  });

  it('denies correct role but wrong ownership', () => {
    const decision = kernel.authorize({
      subject: activeSubject,
      action: 'class.read',
      resource: { ...resource, ownerUserId: 'user-teacher-b' },
      ownership: { ownerUserId: 'user-teacher-b' }
    });

    expect(decision).toMatchObject({
      allowed: false,
      reason: 'RESOURCE_OWNER_MISMATCH'
    });
  });

  it('allows student self access and denies another student resource', () => {
    const studentSubject: AuthorizationSubject = {
      principal: { ...principal, userId: 'student-a', membershipId: 'membership-student-a', roles: ['student'] },
      membershipStatus: 'active'
    };

    expect(
      kernel.authorize({
        subject: studentSubject,
        action: 'student.read',
        resource: { type: 'student', id: 'student-resource-a', schoolId: 'school-a', ownerUserId: 'student-a' },
        ownership: { ownerUserId: 'student-a' }
      })
    ).toEqual({ allowed: true });

    expect(
      kernel.authorize({
        subject: studentSubject,
        action: 'student.read',
        resource: { type: 'student', id: 'student-resource-b', schoolId: 'school-a', ownerUserId: 'student-b' },
        ownership: { ownerUserId: 'student-b' }
      })
    ).toMatchObject({ allowed: false, reason: 'RESOURCE_OWNER_MISMATCH' });
  });

  it('ignores client supplied role and school claims', () => {
    const decision = kernel.authorize({
      subject: activeSubject,
      action: 'grade.write',
      resource: { type: 'grade', id: 'grade-a', schoolId: 'school-a' },
      clientClaims: {
        role: 'admin',
        schoolId: 'school-b',
        userId: 'someone-else'
      }
    });

    expect(decision).toMatchObject({ allowed: false, reason: 'CAPABILITY_MISSING' });
  });

  it('supports deliberate not-found public failure mode', () => {
    const decision = kernel.authorize({
      subject: activeSubject,
      action: 'student.read',
      resource: { type: 'student', id: 'student-b', schoolId: 'school-b' },
      publicFailureMode: 'not_found'
    });

    expect(decision).toMatchObject({
      allowed: false,
      publicFailureMode: 'not_found'
    });
  });
});

describe('createAuthorizationLogEvent', () => {
  it('keeps denial logs safe and diagnostic', () => {
    const event = createAuthorizationLogEvent({
      requestId: 'request-1',
      subject: activeSubject,
      action: 'class.read',
      resource,
      decision: {
        allowed: false,
        reason: 'RESOURCE_OWNER_MISMATCH',
        publicFailureMode: 'not_found'
      }
    });

    expect(event).toEqual({
      event: 'authorization_denied',
      requestId: 'request-1',
      actorUserId: 'user-teacher-a',
      schoolId: 'school-a',
      membershipId: 'membership-a',
      action: 'class.read',
      resourceType: 'class',
      resourceId: 'class-a',
      reason: 'RESOURCE_OWNER_MISMATCH',
      publicFailureMode: 'not_found'
    });
    expect(JSON.stringify(event)).not.toContain('token-a');
  });
});
