import { Transform, Type } from 'class-transformer';
import { IsEmail, IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class CreateStudentDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  @IsString() @MinLength(1) @MaxLength(64) admissionNumber: string;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(100) givenName: string;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(100) familyName: string;
}
export class UpdateStudentDto {
  @IsInt() @Min(1) version: number;
  @ValidateIf((_object, value) => value !== undefined) @Transform(trim) @IsString() @MinLength(1) @MaxLength(100) givenName?: string;
  @ValidateIf((_object, value) => value !== undefined) @Transform(trim) @IsString() @MinLength(1) @MaxLength(100) familyName?: string;
  @ValidateIf((_object, value) => value !== undefined) @IsIn(['active', 'archived']) status?: string;
}
export class StudentListDto {
  @IsOptional() @IsUUID() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 25;
}
export class CreateGuardianDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(200) fullName: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail() @MaxLength(254) email: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(40) phone?: string;
}
export class LinkGuardianDto {
  @IsUUID() guardianId: string;
  @IsIn(['parent', 'guardian', 'other']) relationship: string;
}
export class CreateYearDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(80) label: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsISO8601({ strict: true }) startsOn: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsISO8601({ strict: true }) endsOn: string;
}
export class CreateTermDto extends CreateYearDto {
  @IsUUID() academicYearId: string;
}
export class CreateClassDto {
  @IsUUID() academicYearId: string;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(100) name: string;
}
export class CreateEnrollmentDto {
  @IsUUID() classId: string;
  @IsUUID() academicTermId: string;
  @IsIn(['pending', 'active']) status: string;
}
export class ChangeEnrollmentDto {
  @IsInt() @Min(1) version: number;
  @IsIn(['active', 'withdrawn', 'transferred', 'completed', 'cancelled']) status: string;
}
