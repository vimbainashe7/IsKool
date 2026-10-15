import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TransactionClient } from '../../database/transaction/transaction.service';

export interface AuditRecord {
  actorUserId: string;
  actorMembershipId: string;
  schoolId: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  requestId: string;
  reason?: string;
}

@Injectable()
export class AuditService {
  async record(tx: TransactionClient, record: AuditRecord): Promise<void> {
    await tx.auditEvent.create({
      data: {
        actorUserId: record.actorUserId,
        actorMembershipId: record.actorMembershipId,
        schoolId: record.schoolId,
        action: record.action,
        entityType: record.entityType,
        entityId: record.entityId,
        beforeValue: toJsonValue(record.beforeValue),
        afterValue: toJsonValue(record.afterValue),
        requestId: record.requestId,
        reason: record.reason
      }
    });
  }
}

function toJsonValue(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) {
    return undefined;
  }
  const serialized = JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue | null;
  return serialized === null ? Prisma.JsonNull : serialized;
}
