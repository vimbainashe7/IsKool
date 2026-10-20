import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { StudentController, GuardianController, StudentAdministrationController } from './student.controller';
import { StudentService } from './student.service';
import { StudentRepository } from './student.repository';
@Module({ imports: [AuthModule, AuditModule], controllers: [StudentController, GuardianController, StudentAdministrationController], providers: [StudentService, StudentRepository] })
export class StudentModule {}
