import { Body, Controller, Get, Post } from '@nestjs/common';
import { RequestId } from '../../common/decorators/request-id.decorator';
import {
  AuthenticationRequiredError,
  BusinessRuleError,
  ConflictError,
  PermissionDeniedError,
  ResourceNotFoundError
} from '../../common/errors/application-error';
import { FoundationEchoDto } from './dto/foundation-echo.dto';

@Controller('foundation')
export class FoundationController {
  @Get('missing')
  missing(): never {
    throw new ResourceNotFoundError();
  }

  @Get('auth-required')
  authRequired(): never {
    throw new AuthenticationRequiredError();
  }

  @Get('forbidden')
  forbidden(): never {
    throw new PermissionDeniedError();
  }

  @Get('conflict')
  conflict(): never {
    throw new ConflictError();
  }

  @Get('business-rule')
  businessRule(): never {
    throw new BusinessRuleError();
  }

  @Post('echo')
  echo(@Body() body: FoundationEchoDto, @RequestId() requestId: string): { message: string; requestId: string } {
    return { message: body.message, requestId };
  }
}
