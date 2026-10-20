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

  async summary(tx: TransactionClient, schoolId: string) {
    // One statement gives all totals the same PostgreSQL snapshot. RLS still
    // applies under the restricted runtime role; school comes from principal.
    const [row] = await tx.$queryRaw<Array<{ students: number; activeStudents: number; enrolledStudents: number; activeEnrollments: number; classes: number }>>`
      SELECT
        (SELECT count(*)::int FROM public.students WHERE school_id=${schoolId}::uuid) AS students,
        (SELECT count(*)::int FROM public.students WHERE school_id=${schoolId}::uuid AND status='active') AS "activeStudents",
        (SELECT count(*)::int FROM public.students s WHERE s.school_id=${schoolId}::uuid AND s.status='active'
          AND EXISTS (SELECT 1 FROM public.enrollments e WHERE e.school_id=s.school_id AND e.student_id=s.id AND e.status='active')) AS "enrolledStudents",
        (SELECT count(*)::int FROM public.enrollments e JOIN public.students s ON s.id=e.student_id AND s.school_id=e.school_id
          WHERE e.school_id=${schoolId}::uuid AND e.status='active' AND s.status='active') AS "activeEnrollments",
        (SELECT count(*)::int FROM public.classes WHERE school_id=${schoolId}::uuid) AS classes`;
    return { ...row, withoutClass: row.activeStudents - row.enrolledStudents };
  }

  enrollments(tx: TransactionClient, schoolId: string, limit: number, cursor?: string) {
    return tx.enrollment.findMany({ where: { schoolId, ...(cursor ? { id: { gt: cursor } } : {}) },
      orderBy: { id: 'asc' }, take: limit + 1,
      include: { student: true, schoolClass: true, term: true } });
  }

  detail(tx: TransactionClient, schoolId: string, id: string) {
    return tx.student.findFirst({ where: { id, schoolId }, include: {
      guardians: { include: { guardian: true }, orderBy: { guardianId: 'asc' }, take: 50 },
      enrollments: { include: { schoolClass: true, term: true }, orderBy: [{ enrolledAt: 'desc' }, { id: 'desc' }], take: 50 }
    } });
  }
}
