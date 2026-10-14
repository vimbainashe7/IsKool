import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthPrincipal } from '@aps-sams/auth';
import { CurrentPrincipal } from './current-principal.decorator';
import { ServiceAuthGuard } from './service-auth.guard';

@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(ServiceAuthGuard)
  me(@CurrentPrincipal() principal: AuthPrincipal) {
    return {
      userId: principal.userId,
      schoolId: principal.schoolId,
      membershipId: principal.membershipId,
      sessionId: principal.sessionId,
      scope: principal.scope,
      roles: principal.roles
    };
  }
}
