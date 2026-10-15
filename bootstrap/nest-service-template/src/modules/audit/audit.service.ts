import { Injectable } from '@nestjs/common';
import { TransactionClient } from '../../database/transaction/transaction.service';

export interface AuditRecord {
  actorId: string;
  action: string;
  entity: string;
  recordId: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  timestamp: Date;
  requestId: string;
}

@Injectable()
export class AuditService {
  async record(_tx: TransactionClient, _record: AuditRecord): Promise<void> {
    void _tx;
    void _record;
    // Domain API repositories create concrete audit tables after ownership is ratified.
  }
}
