import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards
} from '@nestjs/common';
import { AuthPrincipal } from '@aps-sams/auth';
import { CurrentPrincipal } from '../auth/current-principal.decorator';
import { RequestId } from '../../common/decorators/request-id.decorator';
import { StudentListDto } from '../students/student.dto';
import { InternalContextQuery } from './internal-read.dto';
import { InternalReadGuard } from './internal-read.guard';
import { InternalReadService } from './internal-read.service';
@Controller()
@UseGuards(InternalReadGuard)
export class InternalReadController {
  constructor(private readonly reads: InternalReadService) {}
  @Get('context') context(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Query() q: InternalContextQuery
  ) {
    return this.reads.context(p, r, q);
  }
  @Get('students/:id/profile') profile(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.reads.profile(p, r, id);
  }
  @Get('students/:id/enrollments/current') enrollments(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: StudentListDto
  ) {
    return this.reads.enrollments(p, r, id, q);
  }
  @Get('classes/:classId/members/:studentId') membership(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string
  ) {
    return this.reads.classMembership(p, r, classId, studentId);
  }
  @Get('classes/:classId/teaching-authority') teaching(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Param('classId', ParseUUIDPipe) classId: string
  ) {
    return this.reads.teachingAuthority(p, r, classId);
  }
  @Get('memberships/current') current(@CurrentPrincipal() p: AuthPrincipal) {
    return this.reads.membership(p);
  }
}
