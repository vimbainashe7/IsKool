import 'reflect-metadata';
import { plainToInstance, Type, Expose } from 'class-transformer';
import {
  ArrayMaxSize,
  Equals,
  IsArray,
  IsDefined,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
  validateSync
} from 'class-validator';

export type AcademicRole = 'student' | 'teacher';
export class ContextQuery {
  @Expose() @IsIn(['student', 'teacher']) role!: AcademicRole;
  @Expose() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit =
    25;
  @Expose() @IsOptional() @IsUUID() cursor?: string;
  @Expose() @IsOptional() @IsUUID() classId?: string;
}
export class StudentProfile {
  @Expose() @IsUUID() id!: string;
  @Expose() @IsUUID() schoolId!: string;
  @Expose() @IsString() @MinLength(1) @MaxLength(64) admissionNumber!: string;
  @Expose() @IsString() @MinLength(1) @MaxLength(100) givenName!: string;
  @Expose() @IsString() @MinLength(1) @MaxLength(100) familyName!: string;
}
export class AcademicPeriod {
  @Expose() @IsUUID() id!: string;
  @Expose() @IsString() @MinLength(1) @MaxLength(80) label!: string;
  @Expose() @IsISO8601() startsOn!: string;
  @Expose() @IsISO8601() endsOn!: string;
}
export class AuthorizedClass {
  @Expose() @IsUUID() id!: string;
  @Expose() @IsString() @MinLength(1) @MaxLength(100) name!: string;
  @Expose()
  @IsDefined()
  @ValidateNested()
  @Type(() => AcademicPeriod)
  academicYear!: AcademicPeriod;
  @Expose()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AcademicPeriod)
  terms!: AcademicPeriod[];
  @Expose()
  @ValidateIf((_o, value) => value !== null)
  @IsInt()
  @Min(0)
  studentCount!: number | null;
}
export class SchoolContext {
  @Expose() @Equals(1) version!: 1;
  @Expose() @IsUUID() schoolId!: string;
  @Expose() @IsUUID() membershipId!: string;
  @Expose() @IsIn(['student', 'teacher']) role!: AcademicRole;
  @Expose() @IsISO8601() asOf!: string;
  @Expose()
  @ValidateIf((_o, value) => value !== null)
  @IsDefined()
  @ValidateNested()
  @Type(() => StudentProfile)
  student!: StudentProfile | null;
  @Expose()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AuthorizedClass)
  classes!: AuthorizedClass[];
  @Expose() @IsInt() @Min(0) totalClasses!: number;
  @Expose() @ValidateIf((_o, value) => value !== null) @IsUUID() nextCursor!:
    string | null;
}
export class CurrentEnrollment {
  @Expose() @IsUUID() id!: string;
  @Expose() @IsUUID() classId!: string;
  @Expose() @IsUUID() academicYearId!: string;
  @Expose() @IsUUID() academicTermId!: string;
  @Expose() @Equals('active') status!: 'active';
  @Expose() @IsISO8601() enrolledAt!: string;
}
export class CurrentEnrollments {
  @Expose() @IsUUID() schoolId!: string;
  @Expose() @IsUUID() studentId!: string;
  @Expose()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CurrentEnrollment)
  items!: CurrentEnrollment[];
  @Expose() @ValidateIf((_o, value) => value !== null) @IsUUID() nextCursor!:
    string | null;
}
export class ClassMembership {
  @Expose() @IsUUID() schoolId!: string;
  @Expose() @IsUUID() studentId!: string;
  @Expose() @IsUUID() classId!: string;
  @Expose() @Equals(true) enrolled!: true;
}
export class TeachingAuthority {
  @Expose() @IsUUID() schoolId!: string;
  @Expose() @IsUUID() membershipId!: string;
  @Expose() @IsUUID() classId!: string;
  @Expose() @Equals(true) assigned!: true;
}
export class ActiveMembership {
  @Expose() @IsUUID() schoolId!: string;
  @Expose() @IsUUID() membershipId!: string;
  @Expose() @Equals(true) active!: true;
}
export class SamsContractError extends Error {
  constructor() {
    super('SAMS returned an invalid authorized resource.');
  }
}
export function parseReadPayload<T extends object>(
  type: new () => T,
  payload: unknown
): T {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload))
    throw new SamsContractError();
  const value = plainToInstance(type, payload, {
    excludeExtraneousValues: true,
    exposeDefaultValues: true
  });
  if (
    validateSync(value, { whitelist: true, forbidUnknownValues: true }).length
  )
    throw new SamsContractError();
  return value;
}
export function parseContext(
  payload: unknown,
  schoolId: string,
  membershipId: string,
  role: AcademicRole
): SchoolContext {
  const value = parseReadPayload(SchoolContext, payload);
  if (
    value.schoolId !== schoolId ||
    value.membershipId !== membershipId ||
    value.role !== role ||
    (value.student && value.student.schoolId !== schoolId) ||
    value.totalClasses < value.classes.length ||
    new Set(value.classes.map((c) => c.id)).size !== value.classes.length
  )
    throw new SamsContractError();
  return value;
}
