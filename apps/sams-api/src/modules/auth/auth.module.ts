import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthPrismaService } from './auth-prisma.service';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { ServiceAuthGuard } from './service-auth.guard';
import { ServiceAccessPolicy } from './service-access.policy';

@Module({
  controllers: [AuthController],
  providers: [AuthPrismaService, AuthRepository, AuthService, ServiceAccessPolicy, ServiceAuthGuard],
  exports: [AuthService, ServiceAccessPolicy, ServiceAuthGuard, AuthRepository]
})
export class AuthModule {}
