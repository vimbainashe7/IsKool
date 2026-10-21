import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthPrincipal } from "@aps-sams/auth";
import { CurrentPrincipal } from "../auth/current-principal.decorator";
import { ServiceAuthGuard } from "../auth/service-auth.guard";
import { RequestId } from "../../common/decorators/request-id.decorator";
import { AssignmentService } from "./assignment.service";
import {
  AssignmentListQuery,
  AssignmentVersionDto,
  CreateAssignmentDto,
  UpdateAssignmentDto,
} from "./assignment.dto";
function actor(
  principal: AuthPrincipal,
  requestId: string,
  authorization: string,
) {
  return { principal, requestId, token: authorization.slice(7) };
}
@Controller("assignments")
@UseGuards(ServiceAuthGuard)
export class AssignmentController {
  constructor(private readonly assignments: AssignmentService) {}
  @Get() list(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Headers("authorization") h: string,
    @Query() q: AssignmentListQuery,
  ) {
    return this.assignments.list(actor(p, r, h), q);
  }
  @Post() create(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Headers("authorization") h: string,
    @Body() d: CreateAssignmentDto,
  ) {
    return this.assignments.create(actor(p, r, h), d);
  }
  @Get(":id") get(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Headers("authorization") h: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.assignments.get(actor(p, r, h), id);
  }
  @Patch(":id") update(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Headers("authorization") h: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() d: UpdateAssignmentDto,
  ) {
    return this.assignments.update(actor(p, r, h), id, d);
  }
  @Post(":id/publish") publish(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Headers("authorization") h: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() d: AssignmentVersionDto,
  ) {
    return this.assignments.transition(
      actor(p, r, h),
      id,
      d.version,
      "published",
    );
  }
  @Post(":id/archive") archive(
    @CurrentPrincipal() p: AuthPrincipal,
    @RequestId() r: string,
    @Headers("authorization") h: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() d: AssignmentVersionDto,
  ) {
    return this.assignments.transition(
      actor(p, r, h),
      id,
      d.version,
      "archived",
    );
  }
}
