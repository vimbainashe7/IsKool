import { Controller, Get, Header, HttpCode, Post, StreamableFile, UseGuards } from '@nestjs/common';
import { AuthPrincipal } from '@aps-sams/auth';
import { CurrentPrincipal } from './current-principal.decorator';
import { AuthenticationRequiredError, ResourceNotFoundError } from '../../common/errors/application-error';
import { AuthRepository } from './auth.repository';
import { ServiceAuthGuard } from './service-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly repository: AuthRepository) {}
  @Get('school-logo')
  @Header('Cache-Control','private, no-store')
  @UseGuards(ServiceAuthGuard)
  async schoolLogo(@CurrentPrincipal() principal: AuthPrincipal) {
    const logo = await this.repository.schoolLogo(principal);
    if (!logo) throw new ResourceNotFoundError('No logo has been saved for your school.');
    return new StreamableFile(logo,{type:'image/webp'});
  }

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

  @Post('logout')
  @HttpCode(200)
  @UseGuards(ServiceAuthGuard)
  async logout(@CurrentPrincipal() principal: AuthPrincipal) {
    await this.repository.revokeSession(principal.sessionId, 'logout');
    return { status: 'LOGGED_OUT' as const };
  }
}
