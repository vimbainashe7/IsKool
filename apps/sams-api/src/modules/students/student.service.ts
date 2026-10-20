import { Injectable } from '@nestjs/common';
import { AuthPrincipal } from '@aps-sams/auth';
import { TransactionClient } from '../../database/transaction/transaction.service';
import { ResourceNotFoundError, ConflictError, BusinessRuleError } from '../../common/errors/application-error';
import { AuditService } from '../audit/audit.service';
import { StudentRepository } from './student.repository';
import { assertEnrollmentTransition, assertStudentAdministrator } from './student.policy';
import { ChangeEnrollmentDto, CreateClassDto, CreateEnrollmentDto, CreateGuardianDto, CreateStudentDto, CreateTermDto, CreateYearDto, LinkGuardianDto, StudentListDto, UpdateStudentDto } from './student.dto';

@Injectable()
export class StudentService {
  constructor(private readonly records: StudentRepository, private readonly audit: AuditService) {}

  private run<T>(p: AuthPrincipal, requestId: string, work: (tx: TransactionClient) => Promise<T>) {
    assertStudentAdministrator(p);
    return this.records.run(p, requestId, work);
  }

  private record(tx: TransactionClient, p: AuthPrincipal, requestId: string, action: string, entityType: string, entityId: string, beforeValue?: unknown, afterValue?: unknown) {
    return this.audit.record(tx, { actorUserId: p.userId, actorMembershipId: p.membershipId, schoolId: p.schoolId, requestId, action, entityType, entityId, beforeValue, afterValue });
  }

  list(p: AuthPrincipal, r: string, query: StudentListDto) {
    return this.run(p, r, async tx => {
      const rows = await this.records.list(tx, p.schoolId, query.limit, query.cursor);
      return { items: rows.slice(0, query.limit), nextCursor: rows.length > query.limit ? rows[query.limit - 1].id : null };
    });
  }

  summary(p: AuthPrincipal, r: string) {
    return this.run(p, r, tx => this.records.summary(tx, p.schoolId));
  }

  enrollments(p: AuthPrincipal, r: string, query: StudentListDto) {
    return this.run(p, r, async tx => {
      const rows = await this.records.enrollments(tx, p.schoolId, query.limit, query.cursor);
      return { items: rows.slice(0, query.limit), nextCursor: rows.length > query.limit ? rows[query.limit - 1].id : null };
    });
  }

  detail(p: AuthPrincipal, r: string, id: string) {
    return this.run(p, r, async tx => {
      const student = await this.records.detail(tx, p.schoolId, id);
      if (!student) throw new ResourceNotFoundError('Student not found in your school.');
      return student;
    });
  }

  create(p: AuthPrincipal, r: string, dto: CreateStudentDto) {
    return this.run(p, r, async tx => {
      const student = await tx.student.create({ data: { ...dto, schoolId: p.schoolId } });
      await this.record(tx, p, r, 'student.created', 'student', student.id, undefined, student);
      return student;
    });
  }

  update(p: AuthPrincipal, r: string, id: string, dto: UpdateStudentDto) {
    return this.run(p, r, async tx => {
      await tx.$queryRaw`SELECT id FROM public.students WHERE id=${id}::uuid AND school_id=${p.schoolId}::uuid FOR UPDATE`;
      const before = await tx.student.findFirst({ where: { id, schoolId: p.schoolId } });
      if (!before) throw new ResourceNotFoundError('Student not found in your school.');
      if (dto.status === 'archived' && await tx.enrollment.count({ where: { studentId: id, schoolId: p.schoolId, status: { in: ['pending', 'active'] } } })) {
        throw new BusinessRuleError('STUDENT_HAS_OPEN_ENROLLMENTS', 'Close the student\'s pending or active enrollments before archiving.');
      }
      const { version, ...fields } = dto;
      const changed = await tx.student.updateMany({ where: { id, schoolId: p.schoolId, version }, data: { ...fields, version: { increment: 1 } } });
      if (changed.count !== 1) throw new ConflictError('This student changed since you opened the record. Reload before saving.');
      const after = await tx.student.findUniqueOrThrow({ where: { id } });
      await this.record(tx, p, r, 'student.updated', 'student', id, before, after);
      return after;
    });
  }

  guardians(p: AuthPrincipal, r: string, query: StudentListDto) {
    return this.run(p, r, async tx => {
      const rows = await tx.guardian.findMany({ where: { schoolId: p.schoolId, ...(query.cursor ? { id: { gt: query.cursor } } : {}) }, orderBy: { id: 'asc' }, take: query.limit + 1 });
      return { items: rows.slice(0, query.limit), nextCursor: rows.length > query.limit ? rows[query.limit - 1].id : null };
    });
  }

  createGuardian(p: AuthPrincipal, r: string, dto: CreateGuardianDto) {
    return this.run(p, r, async tx => {
      const guardian = await tx.guardian.create({ data: { ...dto, schoolId: p.schoolId } });
      await this.record(tx, p, r, 'guardian.created', 'guardian', guardian.id, undefined, { id: guardian.id });
      return guardian;
    });
  }

  linkGuardian(p: AuthPrincipal, r: string, studentId: string, dto: LinkGuardianDto) {
    return this.run(p, r, async tx => {
      const student = await tx.student.findFirst({ where: { id: studentId, schoolId: p.schoolId, status: 'active' } });
      const guardian = await tx.guardian.findFirst({ where: { id: dto.guardianId, schoolId: p.schoolId } });
      if (!student || !guardian) throw new ResourceNotFoundError('Student or guardian not found in your school.');
      const link = await tx.studentGuardian.create({ data: { studentId, schoolId: p.schoolId, ...dto } });
      await this.record(tx, p, r, 'student.guardian_linked', 'student', studentId, undefined, link);
      return link;
    });
  }

  referenceData(p: AuthPrincipal, r: string) {
    return this.run(p, r, async tx => {
      const years = await tx.academicYear.findMany({ where: { schoolId: p.schoolId }, take: 101, orderBy: { startsOn: 'desc' } });
      const terms = await tx.academicTerm.findMany({ where: { schoolId: p.schoolId }, take: 101, orderBy: { startsOn: 'desc' } });
      const classes = await tx.schoolClass.findMany({ where: { schoolId: p.schoolId }, take: 101, orderBy: { name: 'asc' } });
      return { years: years.slice(0, 100), terms: terms.slice(0, 100), classes: classes.slice(0, 100), truncated: years.length > 100 || terms.length > 100 || classes.length > 100 };
    });
  }

  createYear(p: AuthPrincipal, r: string, dto: CreateYearDto) {
    return this.run(p, r, async tx => {
      if (dto.endsOn < dto.startsOn) throw new BusinessRuleError('INVALID_PERIOD_DATES', 'The end date must be on or after the start date.');
      const year = await tx.academicYear.create({ data: { ...dto, schoolId: p.schoolId, startsOn: new Date(dto.startsOn), endsOn: new Date(dto.endsOn) } });
      await this.record(tx, p, r, 'academic_year.created', 'academic_year', year.id, undefined, year);
      return year;
    });
  }

  createTerm(p: AuthPrincipal, r: string, dto: CreateTermDto) {
    return this.run(p, r, async tx => {
      const year = await tx.academicYear.findFirst({ where: { id: dto.academicYearId, schoolId: p.schoolId } });
      if (!year) throw new ResourceNotFoundError('Academic year not found in your school.');
      const startsOn = new Date(dto.startsOn), endsOn = new Date(dto.endsOn);
      if (endsOn < startsOn || startsOn < year.startsOn || endsOn > year.endsOn) throw new BusinessRuleError('INVALID_PERIOD_DATES', 'Term dates must be within the academic year.');
      const term = await tx.academicTerm.create({ data: { ...dto, schoolId: p.schoolId, startsOn, endsOn } });
      await this.record(tx, p, r, 'academic_term.created', 'academic_term', term.id, undefined, term);
      return term;
    });
  }

  createClass(p: AuthPrincipal, r: string, dto: CreateClassDto) {
    return this.run(p, r, async tx => {
      if (!await tx.academicYear.findFirst({ where: { id: dto.academicYearId, schoolId: p.schoolId } })) throw new ResourceNotFoundError('Academic year not found in your school.');
      const schoolClass = await tx.schoolClass.create({ data: { ...dto, schoolId: p.schoolId } });
      await this.record(tx, p, r, 'class.created', 'class', schoolClass.id, undefined, schoolClass);
      return schoolClass;
    });
  }

  enroll(p: AuthPrincipal, r: string, studentId: string, dto: CreateEnrollmentDto) {
    return this.run(p, r, async tx => {
      // Lock the student row to serialize enrollment with archival in another request.
      await tx.$queryRaw`SELECT id FROM public.students WHERE id=${studentId}::uuid AND school_id=${p.schoolId}::uuid FOR UPDATE`;
      const student = await tx.student.findFirst({ where: { id: studentId, schoolId: p.schoolId, status: 'active' } });
      const schoolClass = await tx.schoolClass.findFirst({ where: { id: dto.classId, schoolId: p.schoolId } });
      const term = await tx.academicTerm.findFirst({ where: { id: dto.academicTermId, schoolId: p.schoolId } });
      if (!student || !schoolClass || !term) throw new ResourceNotFoundError('Active student, class or term not found in your school.');
      if (schoolClass.academicYearId !== term.academicYearId) throw new BusinessRuleError('ACADEMIC_CONTEXT_MISMATCH', 'Choose a class and term from the same academic year.');
      const enrollment = await tx.enrollment.create({ data: { ...dto, schoolId: p.schoolId, studentId, academicYearId: term.academicYearId } });
      await this.record(tx, p, r, 'enrollment.created', 'enrollment', enrollment.id, undefined, enrollment);
      return enrollment;
    });
  }

  changeEnrollment(p: AuthPrincipal, r: string, id: string, dto: ChangeEnrollmentDto) {
    return this.run(p, r, async tx => {
      const before = await tx.enrollment.findFirst({ where: { id, schoolId: p.schoolId } });
      if (!before) throw new ResourceNotFoundError('Enrollment not found in your school.');
      assertEnrollmentTransition(before.status, dto.status);
      const changed = await tx.enrollment.updateMany({ where: { id, schoolId: p.schoolId, version: dto.version }, data: {
        status: dto.status, version: { increment: 1 }, endedAt: dto.status === 'active' ? null : new Date()
      } });
      if (changed.count !== 1) throw new ConflictError('This enrollment changed since you opened it. Reload before saving.');
      const after = await tx.enrollment.findUniqueOrThrow({ where: { id } });
      await this.record(tx, p, r, 'enrollment.status_changed', 'enrollment', id, before, after);
      return after;
    });
  }
}
