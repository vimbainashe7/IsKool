import { Type } from "class-transformer";
import {
  IsISO8601,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
export class DraftFields {
  @IsString() @MinLength(1) @MaxLength(160) title!: string;
  @IsString() @MinLength(1) @MaxLength(10000) instructions!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(1000) totalMarks!: number;
  @IsISO8601({ strict: true }) dueAt!: string;
}
export class CreateAssignmentDto extends DraftFields {
  @IsUUID() classId!: string;
  @IsUUID() academicTermId!: string;
}
export class AssignmentVersionDto {
  @IsInt() @Min(1) @Max(2147483646) version!: number;
}
export class UpdateAssignmentDto extends DraftFields {
  @IsInt() @Min(1) @Max(2147483646) version!: number;
}
export class AssignmentListQuery {
  @IsOptional() @IsUUID() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 25;
}
