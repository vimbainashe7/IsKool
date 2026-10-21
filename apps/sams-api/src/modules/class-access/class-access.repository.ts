import { Injectable } from '@nestjs/common';
import { AuthPrincipal } from '@aps-sams/auth';
import { Prisma } from '@prisma/client';
import {
  TransactionClient,
  TransactionService
} from '../../database/transaction/transaction.service';
import {
  BusinessRuleError,
  ConflictError
} from '../../common/errors/application-error';
import { AccountListDto, ClassListDto } from './class-access.dto';
@Injectable()
export class ClassAccessRepository {
  classes(tx: TransactionClient, p: AuthPrincipal, q: ClassListDto) {
    const prefix = (q.search ?? '').trim().replace(/[\\%_]/g, '\\$&') + '%';
    return tx.$queryRaw<
      Array<{ id: string; name: string; academicYearLabel: string }>
    >`
      SELECT c.id,c.name,y.label AS "academicYearLabel" FROM public.classes c
      JOIN public.academic_years y ON y.id=c.academic_year_id AND y.school_id=c.school_id
      WHERE c.school_id=${p.schoolId}::uuid AND (${q.cursor ?? null}::uuid IS NULL OR c.id>${q.cursor ?? null}::uuid)
      AND c.name ILIKE ${prefix} ORDER BY c.id LIMIT ${q.limit + 1}`;
  }
  async account(tx: TransactionClient, p: AuthPrincipal, id: string) {
    const [row] = await tx.$queryRaw<
      Array<{
        id: string;
        displayName: string | null;
        email: string | null;
        active: boolean;
      }>
    >`SELECT m.id,u.display_name AS "displayName",u.email,COALESCE(m.status='active' AND u.status='active',false) AS active FROM public.memberships m LEFT JOIN public.users u ON u.id=m.user_id WHERE m.id=${id}::uuid AND m.school_id=${p.schoolId}::uuid`;
    return row ?? null;
  }
  constructor(private readonly transactions: TransactionService) {}
  async run<T>(
    p: AuthPrincipal,
    r: string,
    work: (tx: TransactionClient) => Promise<T>
  ): Promise<T> {
    try {
      return await this.transactions.runWithPrincipal(
        { ...p, requestId: r },
        work
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002')
          throw new ConflictError(
            'This account link or teaching assignment already exists. Open the existing record.'
          );
        if (error.code === 'P2025')
          throw new ConflictError('This record changed. Reload before saving.');
        if (['P2003', 'P2004'].includes(error.code))
          throw new BusinessRuleError(
            'INVALID_ACCOUNT_CONTEXT',
            'Choose active accounts and matching school records.'
          );
      }
      throw error;
    }
  }
  student(tx: TransactionClient, p: AuthPrincipal, id: string) {
    return tx.student.findFirst({
      where: { id, schoolId: p.schoolId },
      select: {
        id: true,
        schoolId: true,
        membershipId: true,
        status: true,
        version: true
      }
    });
  }
  schoolClass(tx: TransactionClient, p: AuthPrincipal, id: string) {
    return tx.schoolClass.findFirst({
      where: { id, schoolId: p.schoolId },
      select: { id: true, academicYearId: true }
    });
  }
  assignment(
    tx: TransactionClient,
    p: AuthPrincipal,
    classId: string,
    membershipId: string
  ) {
    return tx.classTeacher.findFirst({
      where: { classId, membershipId, schoolId: p.schoolId }
    });
  }
  async eligible(
    tx: TransactionClient,
    p: AuthPrincipal,
    id: string,
    role: 'student' | 'teacher'
  ) {
    const [result] = await tx.$queryRaw<
      Array<{ allowed: boolean }>
    >`SELECT iskool.membership_has_school_role(${id}::uuid,${p.schoolId}::uuid,${role}) AS allowed`;
    return result?.allowed === true;
  }
  accounts(tx: TransactionClient, p: AuthPrincipal, q: AccountListDto) {
    const search =
      (q.search ?? '').toLowerCase().replace(/[\\%_]/g, '\\$&') + '%';
    return tx.$queryRaw<
      Array<{ id: string; displayName: string; email: string }>
    >`SELECT m.id,u.display_name AS "displayName",u.email
  FROM public.memberships m JOIN public.users u ON u.id=m.user_id AND u.status='active'
  WHERE m.school_id=${p.schoolId}::uuid AND m.status='active'
  AND (${q.cursor ?? null}::uuid IS NULL OR m.id>${q.cursor ?? null}::uuid)
  AND (lower(u.display_name) LIKE ${search} OR u.email_normalized LIKE ${search})
  AND iskool.membership_has_school_role(m.id,m.school_id,${q.role}) ORDER BY m.id LIMIT ${q.limit + 1}`;
  }
  teachers(
    tx: TransactionClient,
    p: AuthPrincipal,
    classId: string,
    limit: number,
    cursor?: string
  ) {
    return tx.classTeacher.findMany({
      where: {
        schoolId: p.schoolId,
        classId,
        ...(cursor ? { membershipId: { gt: cursor } } : {})
      },
      orderBy: { membershipId: 'asc' },
      take: limit + 1,
      include: {
        membership: {
          select: {
            status: true,
            user: { select: { displayName: true, email: true, status: true } }
          }
        }
      }
    });
  }
}
