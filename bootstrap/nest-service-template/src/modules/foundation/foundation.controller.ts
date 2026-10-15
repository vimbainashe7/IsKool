import { Body, Controller, Get, Post } from '@nestjs/common';
import { RequestId } from '../../common/decorators/request-id.decorator';
import { ResourceNotFoundError } from '../../common/errors/application-error';
import { FoundationEchoDto } from './dto/foundation-echo.dto';

@Controller('foundation')
export class FoundationController {
  @Get('missing')
  missing(): never {
    throw new ResourceNotFoundError();
  }

  @Post('echo')
  echo(@Body() body: FoundationEchoDto, @RequestId() requestId: string): { message: string; requestId: string } {
    return { message: body.message, requestId };
  }
}
