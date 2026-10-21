import { SubmissionBudgetGuard } from "../submission-budget.guard";
import { ExecutionContext } from "@nestjs/common";
describe("Submission request budget boundary", () => {
  it("uses the authenticated identity and attaches a server-created budget before form validation", async () => {
    const budget = { studentId: "student", token: "server-token" },
      work = { reserveSubmission: jest.fn().mockResolvedValue(budget) },
      request = {
        authPrincipal: { membershipId: "member" },
        requestId: "trace",
        header: () => "Bearer actor-token",
        body: { studentId: "forged" },
        submissionBudget: undefined,
      };
    const guard = new SubmissionBudgetGuard(work as never);
    await expect(
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => request }),
      } as ExecutionContext),
    ).resolves.toBe(true);
    expect(work.reserveSubmission).toHaveBeenCalledWith({
      principal: request.authPrincipal,
      requestId: "trace",
      token: "actor-token",
    });
    expect(request.submissionBudget).toEqual(budget);
  });
  it("fails closed before spending a budget when authentication did not run", async () => {
    const work = { reserveSubmission: jest.fn() },
      guard = new SubmissionBudgetGuard(work as never);
    await expect(
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => ({}) }),
      } as ExecutionContext),
    ).rejects.toMatchObject({ status: 401 });
    expect(work.reserveSubmission).not.toHaveBeenCalled();
  });
});
