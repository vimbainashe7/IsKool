import {
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards
} from '@nestjs/common';
import { AuthPrincipal } from '@aps-sams/auth';
import { ContextQuery } from '@aps-sams/sams-contracts';
import { CurrentPrincipal } from '../auth/current-principal.decorator';
import { ServiceAuthGuard } from '../auth/service-auth.guard';
import { RequestId } from '../../common/decorators/request-id.decorator';
import { AcademicContextService } from './academic-context.service';
@Controller('academic-context')
@UseGuards(ServiceAuthGuard)
export class AcademicContextController {
  constructor(private readonly reads: AcademicContextService) {}
  @Get() context(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Headers('authorization') authorization: string,
    @Query() q: ContextQuery
  ) {
    return this.reads.read(p, r, authorization.slice(7), q);
  }
  @Get('classes/:id') schoolClass(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Headers('authorization') authorization: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: ContextQuery
  ) {
    return this.reads.read(p, r, authorization.slice(7), { ...q, classId: id });
  }
}
