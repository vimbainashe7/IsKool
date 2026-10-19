import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingsRepository } from './settings.repository';
@Module({
  imports: [AuthModule, AuditModule],
  controllers: [SettingsController],
  providers: [SettingsService, SettingsRepository]
})
export class SettingsModule {}
