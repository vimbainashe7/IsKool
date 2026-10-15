import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthPrincipal } from '@aps-sams/auth';
import { CurrentPrincipal } from './current-principal.decorator';
import { AuthenticationRequiredError } from '../../common/errors/application-error';
import { AuthRepository } from './auth.repository';
import { ServiceAuthGuard } from './service-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly repository: AuthRepository) {}

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

  @Get('context')
  @UseGuards(ServiceAuthGuard)
  async context(@CurrentPrincipal() principal: AuthPrincipal) {
    const context = await this.repository.findSessionContext(principal);
    if (!context) {
      throw new AuthenticationRequiredError();
    }
    return context;
  }
}
