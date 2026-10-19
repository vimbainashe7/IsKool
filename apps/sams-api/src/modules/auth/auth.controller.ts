import { Body, Controller, Get, Header, HttpCode, Post, StreamableFile, UseGuards } from '@nestjs/common';
import { AuthPrincipal } from '@aps-sams/auth';
import { AuthService } from './auth.service';
import { CurrentPrincipal } from './current-principal.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ServiceAuthGuard } from './service-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Get('school-logo')
  @Header('Cache-Control','private, no-store')
  @UseGuards(ServiceAuthGuard)
  async schoolLogo(@CurrentPrincipal() principal: AuthPrincipal) {
    return new StreamableFile(await this.authService.schoolLogo(principal),{type:'image/webp'});
  }

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() body: RefreshDto) {
    return this.authService.refresh(body);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(ServiceAuthGuard)
  logout(@CurrentPrincipal() principal: AuthPrincipal) {
    return this.authService.logout(principal.sessionId);
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
  context(@CurrentPrincipal() principal: AuthPrincipal) {
    return this.authService.context(principal);
  }
}
