import { PrivilegedActionPolicy } from './privileged-action';

describe('PrivilegedActionPolicy', () => {
  const policy = new PrivilegedActionPolicy();
  const now = new Date('2026-10-08T16:00:00.000Z');

  it('allows a privileged action when recent authentication is fresh', () => {
    const decision = policy.evaluate({
      action: 'invoice.record-payment',
      authenticatedAt: new Date('2026-10-08T15:57:00.000Z'),
      now,
      recentAuthenticationSeconds: 300
    });

    expect(decision).toEqual({ allowed: true });
  });

  it('denies when recent authentication is stale', () => {
    const decision = policy.evaluate({
      action: 'invoice.record-payment',
      authenticatedAt: new Date('2026-10-08T15:50:00.000Z'),
      now,
      recentAuthenticationSeconds: 300
    });

    expect(decision).toEqual({
      allowed: false,
      reason: 'RECENT_AUTHENTICATION_REQUIRED'
    });
  });

  it('denies when second approval is required but missing', () => {
    const decision = policy.evaluate({
      action: 'invoice.record-payment',
      authenticatedAt: new Date('2026-10-08T15:59:00.000Z'),
      now,
      recentAuthenticationSeconds: 300,
      secondApproval: { required: true }
    });

    expect(decision).toEqual({
      allowed: false,
      reason: 'SECOND_APPROVAL_REQUIRED'
    });
  });

  it('allows when second approval has been supplied by a different approver', () => {
    const decision = policy.evaluate({
      action: 'invoice.record-payment',
      actorUserId: 'actor-1',
      authenticatedAt: new Date('2026-10-08T15:59:00.000Z'),
      now,
      recentAuthenticationSeconds: 300,
      secondApproval: { required: true, approverUserId: 'actor-2' }
    });

    expect(decision).toEqual({ allowed: true });
  });

  it('denies self approval when a second approver is required', () => {
    const decision = policy.evaluate({
      action: 'invoice.record-payment',
      actorUserId: 'actor-1',
      authenticatedAt: new Date('2026-10-08T15:59:00.000Z'),
      now,
      recentAuthenticationSeconds: 300,
      secondApproval: { required: true, approverUserId: 'actor-1' }
    });

    expect(decision).toEqual({
      allowed: false,
      reason: 'SECOND_APPROVER_MUST_DIFFER'
    });
  });
});
