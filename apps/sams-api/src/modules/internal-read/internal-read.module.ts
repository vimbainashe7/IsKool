import {
  INestApplication,
  Injectable,
  Module,
  OnApplicationShutdown
} from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InternalReadGuard } from './internal-read.guard';
import { InternalReadRepository } from './internal-read.repository';
import { InternalReadService } from './internal-read.service';
@Injectable()
export class InternalReadLifecycle implements OnApplicationShutdown {
  server?: INestApplication;
  async onApplicationShutdown() {
    await this.server?.close();
  }
}
// No controller is mounted on the public SAMS application.
@Module({
  imports: [AuthModule],
  providers: [
    InternalReadGuard,
    InternalReadRepository,
    InternalReadService,
    InternalReadLifecycle
  ],
  exports: [InternalReadGuard, InternalReadService, InternalReadLifecycle]
})
export class InternalReadModule {}
