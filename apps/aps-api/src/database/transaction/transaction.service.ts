import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type TransactionClient = Prisma.TransactionClient;

export interface DatabasePrincipal {
  userId: string;
  schoolId: string;
  membershipId: string;
  requestId?: string;
}

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async run<T>(
    callback: (tx: TransactionClient) => Promise<T>,
    options?: Parameters<PrismaClient['$transaction']>[1]
  ): Promise<T> {
    return this.prisma.$transaction(callback, options);
  }

  async runWithPrincipal<T>(
    principal: DatabasePrincipal,
    callback: (tx: TransactionClient) => Promise<T>,
    options?: Parameters<PrismaClient['$transaction']>[1]
  ): Promise<T> {
    return this.run(async (tx) => {
      await tx.$executeRaw`
        SELECT
          set_config('iskool.user_id', ${principal.userId}, true),
          set_config('iskool.school_id', ${principal.schoolId}, true),
          set_config('iskool.membership_id', ${principal.membershipId}, true),
          set_config('iskool.request_id', ${principal.requestId ?? ''}, true)
      `;

      return callback(tx);
    }, options);
  }
}
