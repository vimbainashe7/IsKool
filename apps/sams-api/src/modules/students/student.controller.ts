import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthPrincipal } from '@aps-sams/auth';
import { CurrentPrincipal } from '../auth/current-principal.decorator';
import { ServiceAuthGuard } from '../auth/service-auth.guard';
import { RequestId } from '../../common/decorators/request-id.decorator';
import { StudentService } from './student.service';
import { ChangeEnrollmentDto, CreateClassDto, CreateEnrollmentDto, CreateGuardianDto, CreateStudentDto, CreateTermDto, CreateYearDto, LinkGuardianDto, StudentListDto, UpdateStudentDto } from './student.dto';

@Controller('students')
@UseGuards(ServiceAuthGuard)
export class StudentController {
  constructor(private readonly students: StudentService) {}
  @Get() list(@CurrentPrincipal() p: AuthPrincipal, @RequestId() r: string, @Query() q: StudentListDto) { return this.students.list(p, r, q); }
  @Post() create(@CurrentPrincipal() p: AuthPrincipal, @RequestId() r: string, @Body() dto: CreateStudentDto) { return this.students.create(p, r, dto); }
  @Get(':id') detail(@CurrentPrincipal() p: AuthPrincipal, @RequestId() r: string, @Param('id', ParseUUIDPipe) id: string) { return this.students.detail(p, r, id); }
  @Patch(':id') update(@CurrentPrincipal() p: AuthPrincipal, @RequestId() r: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStudentDto) { return this.students.update(p, r, id, dto); }
  @Post(':id/guardians') link(@CurrentPrincipal() p: AuthPrincipal, @RequestId() r: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: LinkGuardianDto) { return this.students.linkGuardian(p, r, id, dto); }
  @Post(':id/enrollments') enroll(@CurrentPrincipal() p: AuthPrincipal, @RequestId() r: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateEnrollmentDto) { return this.students.enroll(p, r, id, dto); }
}
@Controller('guardians')
@UseGuards(ServiceAuthGuard)
export class GuardianController {
  constructor(private readonly students: StudentService) {}
  @Get() list(@CurrentPrincipal() p: AuthPrincipal, @RequestId() r: string, @Query() q: StudentListDto) { return this.students.guardians(p, r, q); }
  @Post() create(@CurrentPrincipal() p: AuthPrincipal, @RequestId() r: string, @Body() dto: CreateGuardianDto) { return this.students.createGuardian(p, r, dto); }
}
@Controller('student-administration')
@UseGuards(ServiceAuthGuard)
export class StudentAdministrationController {
  constructor(private readonly students: StudentService) {}
  @Get('summary') summary(@CurrentPrincipal() p: AuthPrincipal, @RequestId() r: string) { return this.students.summary(p, r); }
  @Get('enrollments') enrollments(@CurrentPrincipal() p: AuthPrincipal, @RequestId() r: string, @Query() q: StudentListDto) { return this.students.enrollments(p, r, q); }
  @Get('context') context(@CurrentPrincipal() p: AuthPrincipal, @RequestId() r: string) { return this.students.referenceData(p, r); }
  @Post('academic-years') year(@CurrentPrincipal() p: AuthPrincipal, @RequestId() r: string, @Body() dto: CreateYearDto) { return this.students.createYear(p, r, dto); }
  @Post('academic-terms') term(@CurrentPrincipal() p: AuthPrincipal, @RequestId() r: string, @Body() dto: CreateTermDto) { return this.students.createTerm(p, r, dto); }
  @Post('classes') schoolClass(@CurrentPrincipal() p: AuthPrincipal, @RequestId() r: string, @Body() dto: CreateClassDto) { return this.students.createClass(p, r, dto); }
  @Patch('enrollments/:id') transition(@CurrentPrincipal() p: AuthPrincipal, @RequestId() r: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeEnrollmentDto) { return this.students.changeEnrollment(p, r, id, dto); }
}
