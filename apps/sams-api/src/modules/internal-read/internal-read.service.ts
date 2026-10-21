import { Injectable } from '@nestjs/common';
import { AuthPrincipal } from '@aps-sams/auth';
import { AcademicRole, parseContext } from '@aps-sams/sams-contracts';
import {
  ApplicationError,
  AuthenticationRequiredError,
  PermissionDeniedError,
  ResourceNotFoundError
} from '../../common/errors/application-error';
import { StudentListDto } from '../students/student.dto';
import { InternalContextQuery } from './internal-read.dto';
import { InternalReadRepository } from './internal-read.repository';
function assertReader(p: AuthPrincipal, role?: AcademicRole) {
  if (
    p.scope !== 'aps' ||
    !p.roles.some((r) => r === 'student' || r === 'teacher') ||
    (role && !p.roles.includes(role))
  )
    throw new PermissionDeniedError();
}
@Injectable()
export class InternalReadService {
  constructor(private readonly records: InternalReadRepository) {}
  async context(p: AuthPrincipal, r: string, q: InternalContextQuery) {
    assertReader(p, q.role);
    return this.records.run(p, r, async (tx) => {
      const student =
        q.role === 'student' ? await this.records.ownProfile(tx, p) : null;
      const snapshot = await this.records.context(tx, p, q);
      if (!snapshot.authorized) throw new AuthenticationRequiredError();
      if (snapshot.classes.some((c) => c.terms.length > 100))
        throw new ApplicationError(
          'ACADEMIC_CONTEXT_LIMIT',
          'Ask your school administrator to review overlapping academic terms.',
          422
        );
      const classes = snapshot.classes.slice(0, q.limit);
      return parseContext(
        {
          version: 1,
          schoolId: p.schoolId,
          membershipId: p.membershipId,
          role: q.role,
          asOf: snapshot.asOf.toISOString(),
          student,
          classes,
          totalClasses: snapshot.totalClasses,
          nextCursor:
            snapshot.classes.length > q.limit
              ? classes[classes.length - 1].id
              : null
        },
        p.schoolId,
        p.membershipId,
        q.role
      );
    });
  }
  async profile(p: AuthPrincipal, r: string, id: string) {
    assertReader(p);
    return this.records.run(p, r, async (tx) => {
      const profile = await this.records.profile(tx, p, id);
      if (!profile)
        throw new ResourceNotFoundError(
          'Student not found in your authorized school records.'
        );
      return profile;
    });
  }
  async enrollments(
    p: AuthPrincipal,
    r: string,
    id: string,
    q: StudentListDto
  ) {
    assertReader(p);
    return this.records.run(p, r, async (tx) => {
      if (!(await this.records.profile(tx, p, id)))
        throw new ResourceNotFoundError(
          'Student not found in your authorized school records.'
        );
      const rows = await this.records.enrollments(tx, p, id, q.limit, q.cursor);
      return {
        schoolId: p.schoolId,
        studentId: id,
        items: rows
          .slice(0, q.limit)
          .map((row) => ({ ...row, enrolledAt: row.enrolledAt.toISOString() })),
        nextCursor: rows.length > q.limit ? rows[q.limit - 1].id : null
      };
    });
  }
  async classMembership(
    p: AuthPrincipal,
    r: string,
    classId: string,
    studentId: string
  ) {
    assertReader(p);
    return this.records.run(p, r, async (tx) => {
      if (
        !(
          await this.records.enrollments(
            tx,
            p,
            studentId,
            1,
            undefined,
            classId
          )
        ).length
      )
        throw new ResourceNotFoundError(
          'Class membership not found in your authorized school records.'
        );
      return {
        schoolId: p.schoolId,
        classId,
        studentId,
        enrolled: true as const
      };
    });
  }
  async teachingAuthority(p: AuthPrincipal, r: string, classId: string) {
    assertReader(p, 'teacher');
    return this.records.run(p, r, async (tx) => {
      if (!(await this.records.teaching(tx, p, classId)))
        throw new ResourceNotFoundError(
          'Teaching assignment not found in your authorized school records.'
        );
      return {
        schoolId: p.schoolId,
        membershipId: p.membershipId,
        classId,
        assigned: true as const
      };
    });
  }
  membership(p: AuthPrincipal) {
    assertReader(p);
    return {
      schoolId: p.schoolId,
      membershipId: p.membershipId,
      active: true as const
    };
  }
}
