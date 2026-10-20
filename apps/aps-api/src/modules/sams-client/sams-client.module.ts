import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AcademicContextController } from './academic-context.controller';
import { SamsClient } from './sams.client';
import { AcademicContextService } from './academic-context.service';
@Module({
  imports: [AuthModule],
  controllers: [AcademicContextController],
  providers: [SamsClient, AcademicContextService],
  exports: [SamsClient]
})
export class SamsClientModule {}
