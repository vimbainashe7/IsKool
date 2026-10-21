import { AssignmentService } from "../assignment.service";
import {
  PermissionDeniedError,
  ResourceNotFoundError,
} from "../../../common/errors/application-error";
describe("Assignment application boundary", () => {
  const actor = {
    principal: {
      scope: "aps",
      roles: ["teacher"],
      schoolId: "school",
      membershipId: "teacher",
    },
    token: "scoped-token",
    requestId: "request",
  };
  const input = {
    classId: "class",
    academicTermId: "term",
    title: "Algebra",
    instructions: "Show working",
    totalMarks: 20,
    dueAt: "2026-11-01T12:00:00Z",
  };
  function setup(classes: unknown[] = []) {
    const sams = {
      getAuthorizedContext: jest.fn().mockResolvedValue({ classes }),
    };
    const repository = { run: jest.fn() };
    const service = new AssignmentService(sams as never, repository as never);
    return { sams, repository, service };
  }
  it("denies a Student before contacting SAMS or the repository", async () => {
    const { service, sams, repository } = setup();
    await expect(
      service.create(
        {
          ...actor,
          principal: { ...actor.principal, roles: ["student"] },
        } as never,
        input,
      ),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(sams.getAuthorizedContext).not.toHaveBeenCalled();
    expect(repository.run).not.toHaveBeenCalled();
  });
  it("rejects a foreign or unassigned class before writing", async () => {
    const { service, sams, repository } = setup();
    await expect(service.create(actor as never, input)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(sams.getAuthorizedContext).toHaveBeenCalledWith(actor, {
      role: "teacher",
      classId: "class",
      limit: 1,
    });
    expect(repository.run).not.toHaveBeenCalled();
  });
  it("rejects a term from a different academic year", async () => {
    const { service, repository } = setup([
      {
        id: "class",
        academicYear: { id: "year" },
        terms: [{ id: "other-term" }],
      },
    ]);
    await expect(service.create(actor as never, input)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(repository.run).not.toHaveBeenCalled();
  });
});
