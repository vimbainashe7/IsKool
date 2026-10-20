import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsIn,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength
} from 'class-validator';
export class SettingsVersionDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(2147483646) version!: number;
}
export class SchoolNameDto extends SettingsVersionDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;
}
export class OwnProfileDto extends SettingsVersionDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName!: string;
}

export class SaveSettingsDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(2147483646) schoolVersion!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(2147483646) profileVersion!: number;
  @IsIn(['keep', 'replace', 'remove']) logoAction!:
    'keep' | 'replace' | 'remove';
}
