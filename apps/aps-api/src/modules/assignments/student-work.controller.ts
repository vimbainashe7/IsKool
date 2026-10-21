import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthPrincipal } from "@aps-sams/auth";
import { ServiceAuthGuard } from "../auth/service-auth.guard";
import { CurrentPrincipal } from "../auth/current-principal.decorator";
import { RequestId } from "../../common/decorators/request-id.decorator";
import { StudentWorkService } from "./student-work.service";
import { AssignmentListQuery } from "./assignment.dto";
import { SubmitWorkDto } from "./student-work.dto";
import {
  SubmissionBudgetGuard,
  SubmissionRequest,
} from "./submission-budget.guard";
@Controller("student-work")
@UseGuards(ServiceAuthGuard)
export class StudentWorkController {
  constructor(private readonly work: StudentWorkService) {}
  @Get() list(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Headers("authorization") h: string,
    @Query() q: AssignmentListQuery,
  ) {
    return this.work.list({ principal: p, requestId: r, token: h.slice(7) }, q);
  }
  @Get(":id") get(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Headers("authorization") h: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.work.get({ principal: p, requestId: r, token: h.slice(7) }, id);
  }
  @Post(":id/submissions") @UseGuards(SubmissionBudgetGuard) submit(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Headers("authorization") h: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() d: SubmitWorkDto,
    @Req() request: SubmissionRequest,
  ) {
    return this.work.submit(
      { principal: p, requestId: r, token: h.slice(7) },
      id,
      d,
      request.submissionBudget,
    );
  }
}
