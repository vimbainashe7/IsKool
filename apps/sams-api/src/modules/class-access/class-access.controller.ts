import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { AuthPrincipal } from '@aps-sams/auth';
import { CurrentPrincipal } from '../auth/current-principal.decorator';
import { ServiceAuthGuard } from '../auth/service-auth.guard';
import { RequestId } from '../../common/decorators/request-id.decorator';
import { StudentListDto } from '../students/student.dto';
import {
  AccountListDto,
  ClassListDto,
  AssignTeacherDto,
  ChangeTeacherDto,
  LinkAccountDto
} from './class-access.dto';
import { ClassAccessService } from './class-access.service';
@Controller()
@UseGuards(ServiceAuthGuard)
export class ClassAccessController {
  @Get('student-administration/classes') classes(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Query() q: ClassListDto
  ) {
    return this.access.classes(p, r, q);
  }
  @Get('students/:id/account') account(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.access.account(p, r, id);
  }
  constructor(private readonly access: ClassAccessService) {}
  @Get('student-administration/accounts') accounts(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Query() q: AccountListDto
  ) {
    return this.access.accounts(p, r, q);
  }
  @Patch('students/:id/account') link(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LinkAccountDto
  ) {
    return this.access.linkAccount(p, r, id, dto);
  }
  @Get('student-administration/classes/:id/teachers') teachers(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: StudentListDto
  ) {
    return this.access.teachers(p, r, id, q);
  }
  @Post('student-administration/classes/:id/teachers') assign(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTeacherDto
  ) {
    return this.access.assignTeacher(p, r, id, dto);
  }
  @Patch('student-administration/classes/:id/teachers/:membershipId') change(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() dto: ChangeTeacherDto
  ) {
    return this.access.changeTeacher(p, r, id, membershipId, dto);
  }
}
