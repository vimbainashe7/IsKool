import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AuthenticatedRequest } from "../auth/request-auth-principal";
import { AuthenticationRequiredError } from "../../common/errors/application-error";
import { StudentWorkService, SubmissionBudget } from "./student-work.service";
export interface SubmissionRequest extends AuthenticatedRequest {
  requestId?: string;
  submissionBudget?: SubmissionBudget;
}
@Injectable()
export class SubmissionBudgetGuard implements CanActivate {
  constructor(private readonly work: StudentWorkService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SubmissionRequest>();
    if (!request.authPrincipal) throw new AuthenticationRequiredError();
    // Runs after authentication and before DTO/parameter pipes: rejected forms
    // spend the same durable request budget as valid work and duplicate retries.
    request.submissionBudget = await this.work.reserveSubmission({
      principal: request.authPrincipal,
      token: (request.header("authorization") ?? "").slice(7),
      requestId: request.requestId ?? "unknown",
    });
    return true;
  }
}
