import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { ClassAccessController } from './class-access.controller';
import { ClassAccessRepository } from './class-access.repository';
import { ClassAccessService } from './class-access.service';
@Module({
  imports: [AuthModule, AuditModule],
  controllers: [ClassAccessController],
  providers: [ClassAccessRepository, ClassAccessService]
})
export class ClassAccessModule {}
