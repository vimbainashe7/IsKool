import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthPrincipal } from '@aps-sams/auth';
import { ServiceAuthGuard } from '../auth/service-auth.guard';
import { CurrentPrincipal } from '../auth/current-principal.decorator';
import { RequestId } from '../../common/decorators/request-id.decorator';
import { BusinessRuleError } from '../../common/errors/application-error';
import { SettingsService } from './settings.service';
import {
  OwnProfileDto,
  SchoolNameDto,
  SettingsVersionDto,
  SaveSettingsDto
} from './settings.dto';
@Controller('school-settings')
@UseGuards(ServiceAuthGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}
  @Post('save')
  @UseInterceptors(
    FileInterceptor('logo', {
      limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 5, parts: 6 }
    })
  )
  saveAll(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Body() dto: SaveSettingsDto,
    @UploadedFile() file?: { buffer: Buffer }
  ) {
    return this.settings.saveAll(p, r, dto, file?.buffer);
  }
  @Get() read(@CurrentPrincipal() p: AuthPrincipal, @RequestId() r: string) {
    return this.settings.read(p, r);
  }
  @Patch() rename(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Body() dto: SchoolNameDto
  ) {
    return this.settings.rename(p, r, dto);
  }
  @Patch('profile') profile(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Body() dto: OwnProfileDto
  ) {
    return this.settings.profile(p, r, dto);
  }
  @Post('logo')
  @UseInterceptors(
    FileInterceptor('logo', {
      limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 1, parts: 2 }
    })
  )
  logo(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Body() dto: SettingsVersionDto,
    @UploadedFile() file?: { buffer: Buffer }
  ) {
    if (!file?.buffer)
      throw new BusinessRuleError('LOGO_REQUIRED', 'Choose a logo image.');
    return this.settings.logo(p, r, dto.version, file.buffer);
  }
  @Delete('logo') remove(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Body() dto: SettingsVersionDto
  ) {
    return this.settings.removeLogo(p, r, dto.version);
  }
}
