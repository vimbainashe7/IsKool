import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthPrismaService } from './auth-prisma.service';
import { AuthRepository } from './auth.repository';
import { ServiceAuthGuard } from './service-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthPrismaService, AuthRepository, ServiceAuthGuard],
  exports: [AuthRepository, ServiceAuthGuard]
})
export class AuthModule {}
