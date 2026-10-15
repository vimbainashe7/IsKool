import { IsString, Length } from 'class-validator';

export class FoundationEchoDto {
  @IsString()
  @Length(1, 80)
  message!: string;
}
