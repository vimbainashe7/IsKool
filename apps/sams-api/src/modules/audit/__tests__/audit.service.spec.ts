import { AuditService } from '../audit.service';

describe('AuditService', () => {
  it('writes audit records through the caller transaction', async () => {
    const tx = {
      auditEvent: {
        create: jest.fn().mockResolvedValue({})
      }
    };
    const service = new AuditService();

    await service.record(tx as never, {
      actorUserId: 'user-1',
      actorMembershipId: 'membership-1',
      schoolId: 'school-1',
      action: 'invoice.record-payment',
      entityType: 'invoice',
      entityId: 'invoice-1',
      beforeValue: { balance: 100 },
      afterValue: { balance: 0 },
      requestId: 'request-1',
      reason: 'payment received'
    });

    expect(tx.auditEvent.create).toHaveBeenCalledWith({
      data: {
        actorUserId: 'user-1',
        actorMembershipId: 'membership-1',
        schoolId: 'school-1',
        action: 'invoice.record-payment',
        entityType: 'invoice',
        entityId: 'invoice-1',
        beforeValue: { balance: 100 },
        afterValue: { balance: 0 },
        requestId: 'request-1',
        reason: 'payment received'
      }
    });
  });
});
