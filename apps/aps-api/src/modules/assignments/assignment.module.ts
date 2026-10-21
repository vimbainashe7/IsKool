import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuditModule } from "../audit/audit.module";
import { SamsClientModule } from "../sams-client/sams-client.module";
import { AssignmentController } from "./assignment.controller";
import { AssignmentService } from "./assignment.service";
import { AssignmentRepository } from "./assignment.repository";
@Module({
  imports: [AuthModule, AuditModule, SamsClientModule],
  controllers: [AssignmentController],
  providers: [AssignmentService, AssignmentRepository],
})
export class AssignmentModule {}
