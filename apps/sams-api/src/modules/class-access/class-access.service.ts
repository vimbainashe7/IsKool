import { Injectable } from '@nestjs/common';
import { AuthPrincipal } from '@aps-sams/auth';
import { TransactionClient } from '../../database/transaction/transaction.service';
import {
  BusinessRuleError,
  ConflictError,
  ResourceNotFoundError
} from '../../common/errors/application-error';
import { AuditService } from '../audit/audit.service';
import { assertStudentAdministrator } from '../students/student.policy';
import { StudentListDto } from '../students/student.dto';
import {
  AccountListDto,
  ClassListDto,
  AssignTeacherDto,
  ChangeTeacherDto,
  LinkAccountDto
} from './class-access.dto';
import { ClassAccessRepository } from './class-access.repository';
@Injectable()
export class ClassAccessService {
  classes(p: AuthPrincipal, r: string, q: ClassListDto) {
    return this.run(p, r, async (tx) => {
      const rows = await this.records.classes(tx, p, q);
      return {
        items: rows.slice(0, q.limit).map((row) => ({
          id: row.id,
          name: row.name,
          academicYearLabel: row.academicYearLabel
        })),
        nextCursor: rows.length > q.limit ? rows[q.limit - 1].id : null
      };
    });
  }
  async account(p: AuthPrincipal, r: string, id: string) {
    return this.run(p, r, async (tx) => {
      const student = await this.records.student(tx, p, id);
      if (!student)
        throw new ResourceNotFoundError('Student not found in your school.');
      return {
        studentId: id,
        membershipId: student.membershipId,
        version: student.version,
        account: student.membershipId
          ? await this.records.account(tx, p, student.membershipId)
          : null
      };
    });
  }
  constructor(
    private readonly records: ClassAccessRepository,
    private readonly audit: AuditService
  ) {}
  private async run<T>(
    p: AuthPrincipal,
    r: string,
    work: (tx: TransactionClient) => Promise<T>
  ) {
    assertStudentAdministrator(p);
    return this.records.run(p, r, work);
  }
  private record(
    tx: TransactionClient,
    p: AuthPrincipal,
    r: string,
    action: string,
    entityType: string,
    entityId: string,
    beforeValue: unknown,
    afterValue: unknown
  ) {
    return this.audit.record(tx, {
      actorUserId: p.userId,
      actorMembershipId: p.membershipId,
      schoolId: p.schoolId,
      requestId: r,
      action,
      entityType,
      entityId,
      beforeValue,
      afterValue
    });
  }
  accounts(p: AuthPrincipal, r: string, q: AccountListDto) {
    return this.run(p, r, async (tx) => {
      const items = await this.records.accounts(tx, p, q);
      return {
        items: items.slice(0, q.limit),
        nextCursor: items.length > q.limit ? items[q.limit - 1].id : null
      };
    });
  }
  linkAccount(p: AuthPrincipal, r: string, id: string, dto: LinkAccountDto) {
    return this.run(p, r, async (tx) => {
      const before = await this.records.student(tx, p, id);
      if (!before)
        throw new ResourceNotFoundError('Student not found in your school.');
      if (before.version !== dto.version)
        throw new ConflictError('This student changed. Reload before saving.');
      if (before.membershipId === dto.membershipId)
        return {
          studentId: id,
          membershipId: before.membershipId,
          version: before.version
        };
      if (dto.membershipId) {
        if (before.status !== 'active')
          throw new BusinessRuleError(
            'INACTIVE_STUDENT',
            'Link an account only to an active student.'
          );
        if (!(await this.records.eligible(tx, p, dto.membershipId, 'student')))
          throw new BusinessRuleError(
            'INVALID_STUDENT_ACCOUNT',
            'Choose an active Student account in your school.'
          );
      }
      const after = await tx.student.update({
        where: { id, schoolId: p.schoolId, version: dto.version },
        data: { membershipId: dto.membershipId, version: { increment: 1 } },
        select: { id: true, membershipId: true, version: true }
      });
      await this.record(
        tx,
        p,
        r,
        'student.account_linked',
        'student',
        id,
        { membershipId: before.membershipId, version: before.version },
        after
      );
      return {
        studentId: id,
        membershipId: after.membershipId,
        version: after.version
      };
    });
  }
  teachers(p: AuthPrincipal, r: string, id: string, q: StudentListDto) {
    return this.run(p, r, async (tx) => {
      if (!(await this.records.schoolClass(tx, p, id)))
        throw new ResourceNotFoundError('Class not found in your school.');
      const rows = await this.records.teachers(tx, p, id, q.limit, q.cursor);
      return {
        items: rows.slice(0, q.limit).map((row) => ({
          classId: row.classId,
          membershipId: row.membershipId,
          status: row.status,
          version: row.version,
          displayName: row.membership.user.displayName,
          email: row.membership.user.email,
          accountActive:
            row.membership.status === 'active' &&
            row.membership.user.status === 'active'
        })),
        nextCursor:
          rows.length > q.limit ? rows[q.limit - 1].membershipId : null
      };
    });
  }
  assignTeacher(
    p: AuthPrincipal,
    r: string,
    id: string,
    dto: AssignTeacherDto
  ) {
    return this.run(p, r, async (tx) => {
      const schoolClass = await this.records.schoolClass(tx, p, id);
      if (!schoolClass)
        throw new ResourceNotFoundError('Class not found in your school.');
      if (!(await this.records.eligible(tx, p, dto.membershipId, 'teacher')))
        throw new BusinessRuleError(
          'INVALID_TEACHER_ACCOUNT',
          'Choose an active Teacher account in your school.'
        );
      const after = await tx.classTeacher.create({
        data: {
          classId: id,
          membershipId: dto.membershipId,
          schoolId: p.schoolId,
          academicYearId: schoolClass.academicYearId
        }
      });
      await this.record(
        tx,
        p,
        r,
        'teacher.class_assigned',
        'class_teacher',
        `${id}:${dto.membershipId}`,
        undefined,
        after
      );
      return after;
    });
  }
  changeTeacher(
    p: AuthPrincipal,
    r: string,
    classId: string,
    membershipId: string,
    dto: ChangeTeacherDto
  ) {
    return this.run(p, r, async (tx) => {
      const before = await this.records.assignment(
        tx,
        p,
        classId,
        membershipId
      );
      if (!before)
        throw new ResourceNotFoundError(
          'Teaching assignment not found in your school.'
        );
      if (before.version !== dto.version)
        throw new ConflictError(
          'This assignment changed. Reload before saving.'
        );
      if (before.status === dto.status)
        throw new ConflictError(
          'This assignment already has that status. Reload to see current authority.'
        );
      if (
        dto.status === 'active' &&
        !(await this.records.eligible(tx, p, membershipId, 'teacher'))
      )
        throw new BusinessRuleError(
          'INVALID_TEACHER_ACCOUNT',
          'Choose an active Teacher account in your school.'
        );
      const after = await tx.classTeacher.update({
        where: {
          classId_membershipId: { classId, membershipId },
          schoolId: p.schoolId,
          version: dto.version
        },
        data: { status: dto.status, version: { increment: 1 } }
      });
      await this.record(
        tx,
        p,
        r,
        'teacher.class_status_changed',
        'class_teacher',
        `${classId}:${membershipId}`,
        before,
        after
      );
      return after;
    });
  }
}
