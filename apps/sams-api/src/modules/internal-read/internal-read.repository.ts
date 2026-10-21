import { Injectable } from '@nestjs/common';
import { AuthPrincipal } from '@aps-sams/auth';
import { AuthorizedClass, StudentProfile } from '@aps-sams/sams-contracts';
import {
  TransactionClient,
  TransactionService
} from '../../database/transaction/transaction.service';
import { InternalContextQuery } from './internal-read.dto';
const profileSelect = {
  id: true,
  schoolId: true,
  admissionNumber: true,
  givenName: true,
  familyName: true
} as const;
@Injectable()
export class InternalReadRepository {
  constructor(private readonly transactions: TransactionService) {}
  run<T>(
    p: AuthPrincipal,
    r: string,
    work: (tx: TransactionClient) => Promise<T>
  ) {
    return this.transactions.runWithPrincipal({ ...p, requestId: r }, work);
  }
  profile(tx: TransactionClient, p: AuthPrincipal, id: string) {
    return tx.student.findFirst({
      where: { id, schoolId: p.schoolId, status: 'active' },
      select: profileSelect
    });
  }
  ownProfile(
    tx: TransactionClient,
    p: AuthPrincipal
  ): Promise<StudentProfile | null> {
    return tx.student.findFirst({
      where: {
        schoolId: p.schoolId,
        membershipId: p.membershipId,
        status: 'active'
      },
      select: profileSelect
    });
  }
  async context(
    tx: TransactionClient,
    p: AuthPrincipal,
    q: InternalContextQuery
  ) {
    const [snapshot] = await tx.$queryRaw<
      Array<{
        authorized: boolean;
        asOf: Date;
        totalClasses: number;
        classes: AuthorizedClass[];
      }>
    >`
   WITH day AS (SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Harare')::date AS today),
   visible AS (
    SELECT c.id,c.name,c.academic_year_id,y.label,y.starts_on,y.ends_on FROM public.classes c
    JOIN public.academic_years y ON y.id=c.academic_year_id AND y.school_id=c.school_id CROSS JOIN day
    WHERE c.school_id=${p.schoolId}::uuid AND day.today BETWEEN y.starts_on AND y.ends_on
    AND (${q.classId ?? null}::uuid IS NULL OR c.id=${q.classId ?? null}::uuid)
    AND (( ${q.role}='teacher' AND EXISTS(SELECT 1 FROM public.class_teachers ct WHERE ct.class_id=c.id AND ct.school_id=c.school_id AND ct.membership_id=${p.membershipId}::uuid AND ct.status='active'))
    OR (${q.role}='student' AND EXISTS(SELECT 1 FROM public.enrollments e JOIN public.students s ON s.id=e.student_id AND s.school_id=e.school_id
      JOIN public.academic_terms t ON t.id=e.academic_term_id AND t.school_id=e.school_id
      WHERE e.class_id=c.id AND e.school_id=c.school_id AND e.status='active' AND s.status='active' AND s.membership_id=${p.membershipId}::uuid AND day.today BETWEEN t.starts_on AND t.ends_on)))
   ), page AS (SELECT * FROM visible WHERE ${q.cursor ?? null}::uuid IS NULL OR id>${q.cursor ?? null}::uuid ORDER BY id LIMIT ${q.limit + 1}),
   terms AS (SELECT t.academic_year_id,jsonb_agg(jsonb_build_object('id',t.id,'label',t.label,'startsOn',t.starts_on,'endsOn',t.ends_on) ORDER BY t.starts_on,t.id) AS periods
    FROM public.academic_terms t JOIN (SELECT DISTINCT academic_year_id FROM page) y ON y.academic_year_id=t.academic_year_id CROSS JOIN day
    WHERE t.school_id=${p.schoolId}::uuid AND day.today BETWEEN t.starts_on AND t.ends_on GROUP BY t.academic_year_id),
   counts AS (SELECT e.class_id,count(DISTINCT e.student_id)::int AS students FROM public.enrollments e
    JOIN page ON page.id=e.class_id JOIN public.students s ON s.id=e.student_id AND s.school_id=e.school_id AND s.status='active'
    JOIN public.academic_terms t ON t.id=e.academic_term_id AND t.school_id=e.school_id CROSS JOIN day
    WHERE ${q.role}='teacher' AND e.school_id=${p.schoolId}::uuid AND e.status='active' AND day.today BETWEEN t.starts_on AND t.ends_on GROUP BY e.class_id)
   SELECT iskool.principal_can_access_school(${p.schoolId}::uuid) AS authorized, CURRENT_TIMESTAMP AS "asOf",(SELECT count(*)::int FROM visible) AS "totalClasses",
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id',page.id,'name',page.name,
      'academicYear',jsonb_build_object('id',page.academic_year_id,'label',page.label,'startsOn',page.starts_on,'endsOn',page.ends_on),
      'terms',COALESCE(terms.periods,'[]'::jsonb),'studentCount',CASE WHEN ${q.role}='teacher' THEN COALESCE(counts.students,0) ELSE NULL END) ORDER BY page.id)
      FROM page LEFT JOIN terms ON terms.academic_year_id=page.academic_year_id LEFT JOIN counts ON counts.class_id=page.id),'[]'::jsonb) AS classes`;
    return snapshot;
  }
  enrollments(
    tx: TransactionClient,
    p: AuthPrincipal,
    studentId: string,
    limit: number,
    cursor?: string,
    classId?: string
  ) {
    return tx.$queryRaw<
      Array<{
        id: string;
        classId: string;
        academicYearId: string;
        academicTermId: string;
        status: 'active';
        enrolledAt: Date;
      }>
    >`
   SELECT e.id,e.class_id AS "classId",e.academic_year_id AS "academicYearId",e.academic_term_id AS "academicTermId",e.status,e.enrolled_at AS "enrolledAt"
   FROM public.enrollments e JOIN public.academic_terms t ON t.id=e.academic_term_id AND t.school_id=e.school_id
   JOIN public.students s ON s.id=e.student_id AND s.school_id=e.school_id AND s.status='active'
   WHERE e.school_id=${p.schoolId}::uuid AND e.student_id=${studentId}::uuid AND e.status='active'
   AND (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Harare')::date BETWEEN t.starts_on AND t.ends_on
   AND (${cursor ?? null}::uuid IS NULL OR e.id>${cursor ?? null}::uuid) AND (${classId ?? null}::uuid IS NULL OR e.class_id=${classId ?? null}::uuid)
   ORDER BY e.id LIMIT ${limit + 1}`;
  }
  teaching(tx: TransactionClient, p: AuthPrincipal, classId: string) {
    return tx.classTeacher.findFirst({
      where: {
        classId,
        schoolId: p.schoolId,
        membershipId: p.membershipId,
        status: 'active'
      },
      select: { classId: true }
    });
  }
}
