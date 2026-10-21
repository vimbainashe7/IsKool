import {
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
export class SubmitWorkDto {
  @IsString() @MinLength(1) @MaxLength(10000) text!: string;
  @IsInt() @Min(0) @Max(3) expectedAttempt!: number;
}
