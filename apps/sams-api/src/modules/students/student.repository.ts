import { Injectable } from '@nestjs/common';
import { AuthPrincipal } from '@aps-sams/auth';
import { Prisma } from '@prisma/client';
import { TransactionService, TransactionClient } from '../../database/transaction/transaction.service';
import { ConflictError, BusinessRuleError } from '../../common/errors/application-error';

@Injectable()
export class StudentRepository {
  constructor(private readonly transactions: TransactionService) {}

  async run<T>(principal: AuthPrincipal, requestId: string, work: (tx: TransactionClient) => Promise<T>): Promise<T> {
    try {
      return await this.transactions.runWithPrincipal({ ...principal, requestId }, work);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new ConflictError('This identifier or active enrollment already exists. Open the existing record instead.');
        if (error.code === 'P2003' || error.code === 'P2004') throw new BusinessRuleError('INVALID_SCHOOL_RECORD', 'The related school records or lifecycle state are not valid.');
      }
      throw error;
    }
  }

  list(tx: TransactionClient, schoolId: string, limit: number, cursor?: string) {
    return tx.student.findMany({ where: { schoolId, ...(cursor ? { id: { gt: cursor } } : {}) }, orderBy: { id: 'asc' }, take: limit + 1 });
  }

  detail(tx: TransactionClient, schoolId: string, id: string) {
    return tx.student.findFirst({ where: { id, schoolId }, include: {
      guardians: { include: { guardian: true }, orderBy: { guardianId: 'asc' }, take: 50 },
      enrollments: { include: { schoolClass: true, term: true }, orderBy: [{ enrolledAt: 'desc' }, { id: 'desc' }], take: 50 }
    } });
  }
}
