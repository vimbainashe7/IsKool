import { Injectable } from "@nestjs/common";
import { TransactionClient } from "../../database/transaction/transaction.service";
import { Prisma } from "@prisma/client";

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
}

@Injectable()
export class AuditService {
  async record(tx: TransactionClient, record: AuditRecord): Promise<void> {
    // INSERT-only runtime privilege: do not request a RETURNING audit row.
    await tx.auditEvent.createMany({
      data: [
        {
          ...record,
          beforeValue:
            record.beforeValue === undefined
              ? undefined
              : (JSON.parse(
                  JSON.stringify(record.beforeValue),
                ) as Prisma.InputJsonValue),
          afterValue:
            record.afterValue === undefined
              ? undefined
              : (JSON.parse(
                  JSON.stringify(record.afterValue),
                ) as Prisma.InputJsonValue),
        },
      ],
    });
  }
}
