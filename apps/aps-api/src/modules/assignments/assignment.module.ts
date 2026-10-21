import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuditModule } from "../audit/audit.module";
import { SamsClientModule } from "../sams-client/sams-client.module";
import { AssignmentController } from "./assignment.controller";
import { AssignmentService } from "./assignment.service";
import { AssignmentRepository } from "./assignment.repository";
import { StudentWorkController } from "./student-work.controller";
import { StudentWorkService } from "./student-work.service";
import { StudentWorkRepository } from "./student-work.repository";
import { SubmissionBudgetGuard } from "./submission-budget.guard";
@Module({
  imports: [AuthModule, AuditModule, SamsClientModule],
  controllers: [AssignmentController, StudentWorkController],
  providers: [
    AssignmentService,
    AssignmentRepository,
    StudentWorkService,
    StudentWorkRepository,
    SubmissionBudgetGuard,
  ],
})
export class AssignmentModule {}
