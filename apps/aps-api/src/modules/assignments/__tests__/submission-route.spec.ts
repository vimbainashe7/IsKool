import { Test } from "@nestjs/testing";
import { ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { StudentWorkController } from "../student-work.controller";
import { StudentWorkService } from "../student-work.service";
import { SubmissionBudgetGuard } from "../submission-budget.guard";
import { ServiceAuthGuard } from "../../auth/service-auth.guard";
describe("Authenticated submission route lifecycle", () => {
  it("spends a durable request budget even when DTO validation rejects the form", async () => {
    const work = {
      reserveSubmission: jest
        .fn()
        .mockResolvedValue({
          studentId: "derived-student",
          token: "server-token",
        }),
      submit: jest.fn(),
    };
    const module = await Test.createTestingModule({
      controllers: [StudentWorkController],
      providers: [
        SubmissionBudgetGuard,
        { provide: StudentWorkService, useValue: work },
      ],
    })
      .overrideGuard(ServiceAuthGuard)
      .useValue({
        canActivate: (ctx: {
          switchToHttp: () => { getRequest: () => { authPrincipal: unknown } };
        }) => {
          ctx.switchToHttp().getRequest().authPrincipal = {
            scope: "aps",
            roles: ["student"],
            schoolId: "school",
            membershipId: "member",
          };
          return true;
        },
      })
      .compile();
    const app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    try {
      await request(app.getHttpServer())
        .post("/student-work/a9000000-0000-4000-8000-000000000001/submissions")
        .set("authorization", "Bearer actor-token")
        .send({ text: "Answer", expectedAttempt: -1 })
        .expect(400);
      expect(work.reserveSubmission).toHaveBeenCalledTimes(1);
      expect(work.submit).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});
