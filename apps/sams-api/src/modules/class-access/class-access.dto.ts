import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf
} from 'class-validator';
import { StudentListDto } from '../students/student.dto';
export class AccountListDto extends StudentListDto {
  @IsIn(['student', 'teacher']) role!: 'student' | 'teacher';
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  search?: string;
}
export class ClassListDto extends StudentListDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
}
class VersionDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(2147483646) version!: number;
}
export class LinkAccountDto extends VersionDto {
  @ValidateIf((_o, value) => value !== null) @IsUUID() membershipId!:
    string | null;
}
export class AssignTeacherDto {
  @IsUUID() membershipId!: string;
}
export class ChangeTeacherDto extends VersionDto {
  @IsIn(['active', 'revoked']) status!: 'active' | 'revoked';
}
