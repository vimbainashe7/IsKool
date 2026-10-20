import { Injectable } from '@nestjs/common';
import { AuthPrincipal } from '@aps-sams/auth';
import { Prisma } from '@prisma/client';
import { TransactionService, TransactionClient } from '../../database/transaction/transaction.service';
import { ConflictError, BusinessRuleError } from '../../common/errors/application-error';

export interface SchoolReferencePeriod {
  id: string;
  schoolId: string;
  label: string;
  startsOn: string;
  endsOn: string;
  createdAt: string;
  updatedAt: string;
}
export interface SchoolReferenceData {
  years: SchoolReferencePeriod[];
  terms: Array<SchoolReferencePeriod & { academicYearId: string }>;
  classes: Array<{
    id: string;
    schoolId: string;
    academicYearId: string;
    name: string;
    createdAt: string;
    updatedAt: string;
  }>;
  truncated: boolean;
}

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

  async referenceData(
    tx: TransactionClient,
    schoolId: string
  ): Promise<SchoolReferenceData> {
    // One bounded snapshot preserves the existing camel-case ISO JSON contract.
    const [data] = await tx.$queryRaw<SchoolReferenceData[]>`
      WITH years AS (SELECT id,school_id AS "schoolId",label,
        to_char(starts_on::timestamp,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "startsOn",
        to_char(ends_on::timestamp,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "endsOn",
        to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
        to_char(updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "updatedAt"
        FROM public.academic_years WHERE school_id=${schoolId}::uuid ORDER BY starts_on DESC,id LIMIT 101),
      terms AS (SELECT id,school_id AS "schoolId",academic_year_id AS "academicYearId",label,
        to_char(starts_on::timestamp,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "startsOn",
        to_char(ends_on::timestamp,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "endsOn",
        to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
        to_char(updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "updatedAt"
        FROM public.academic_terms WHERE school_id=${schoolId}::uuid ORDER BY starts_on DESC,id LIMIT 101),
      classes AS (SELECT id,school_id AS "schoolId",academic_year_id AS "academicYearId",name,
        to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
        to_char(updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "updatedAt"
        FROM public.classes WHERE school_id=${schoolId}::uuid ORDER BY name,id LIMIT 101)
      SELECT COALESCE((SELECT jsonb_agg(y ORDER BY y."startsOn" DESC,y.id) FROM(SELECT * FROM years ORDER BY "startsOn" DESC,id LIMIT 100)y),'[]'::jsonb) AS years,
        COALESCE((SELECT jsonb_agg(t ORDER BY t."startsOn" DESC,t.id) FROM(SELECT * FROM terms ORDER BY "startsOn" DESC,id LIMIT 100)t),'[]'::jsonb) AS terms,
        COALESCE((SELECT jsonb_agg(c ORDER BY c.name,c.id) FROM(SELECT * FROM classes ORDER BY name,id LIMIT 100)c),'[]'::jsonb) AS classes,
        ((SELECT count(*)>100 FROM years) OR (SELECT count(*)>100 FROM terms) OR (SELECT count(*)>100 FROM classes)) AS truncated`;
    return data;
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
