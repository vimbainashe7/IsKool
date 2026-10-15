import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('live')
  live(): { status: 'ok'; timestamp: string } {
    return this.health.live();
  }

  @Get('ready')
  async ready(): Promise<{ status: 'ok' | 'degraded'; dependencies: Record<string, string>; timestamp: string }> {
    return this.health.ready();
  }
}
