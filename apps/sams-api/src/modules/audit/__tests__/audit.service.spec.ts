import { AuditService } from '../audit.service';

describe('AuditService', () => {
  it('inserts all entity audits together and propagates failure for transaction rollback', async () => {
    const tx = {
      auditEvent: {
        createMany: jest.fn().mockRejectedValue(new Error('audit unavailable'))
      }
    };
    const record = {
      actorUserId: 'user',
      actorMembershipId: 'member',
      schoolId: 'school',
      action: 'school.settings_updated',
      entityType: 'school',
      entityId: 'school',
      requestId: 'request',
      afterValue: { name: 'School' }
    };
    await expect(
      new AuditService().recordMany(tx as never, [
        record,
        { ...record, entityType: 'user', entityId: 'user' }
      ])
    ).rejects.toThrow('audit unavailable');
    expect(tx.auditEvent.createMany).toHaveBeenCalledTimes(1);
    expect(tx.auditEvent.createMany.mock.calls[0][0].data).toHaveLength(2);
  });
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
