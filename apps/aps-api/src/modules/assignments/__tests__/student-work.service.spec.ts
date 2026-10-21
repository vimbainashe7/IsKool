import { StudentWorkService } from "../student-work.service";
import {
  PermissionDeniedError,
  ResourceNotFoundError,
} from "../../../common/errors/application-error";
describe("Student academic ownership boundary", () => {
  const actor = {
    principal: {
      scope: "aps",
      roles: ["student"],
      schoolId: "school",
      membershipId: "member",
    },
    token: "actor",
    requestId: "request",
  };
  function setup(student: unknown = { id: "student" }) {
    const sams = {
      getAuthorizedContext: jest
        .fn()
        .mockResolvedValue({ student, classes: [] }),
    };
    const records = {
      run: jest.fn(),
      consume: jest.fn().mockResolvedValue(true),
    };
    return {
      sams,
      records,
      service: new StudentWorkService(sams as never, records as never),
    };
  }
  it("denies Teachers before consuming a submission budget or reading data", async () => {
    const { service, sams, records } = setup();
    await expect(
      service.submit(
        {
          ...actor,
          principal: { ...actor.principal, roles: ["teacher"] },
        } as never,
        "assignment",
        { text: "Answer", expectedAttempt: 0 },
      ),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(sams.getAuthorizedContext).not.toHaveBeenCalled();
    expect(records.consume).not.toHaveBeenCalled();
  });
  it("does not invent a student identity when no account is linked", async () => {
    const { service, records } = setup(null);
    await expect(
      service.submit(actor as never, "assignment", {
        text: "Answer",
        expectedAttempt: 0,
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(records.consume).not.toHaveBeenCalled();
  });
  it("rejects a depleted shared database budget before attempting a write", async () => {
    const { service, records } = setup();
    records.consume.mockResolvedValue(false);
    await expect(
      service.submit(actor as never, "assignment", {
        text: "Answer",
        expectedAttempt: 0,
      }),
    ).rejects.toMatchObject({ status: 429 });
    expect(records.run).not.toHaveBeenCalled();
  });
  function mutations(attempt = 0) {
    const now = new Date(),
      previous = {
        id: "submission",
        assignmentId: "assignment",
        schoolId: "school",
        studentId: "student",
        studentMembershipId: "member",
        text: "Saved answer",
        attempt,
        submittedAt: now,
        status: "submitted",
      };
    const task = {
      id: "assignment",
      schoolId: "school",
      classId: "class",
      academicYearId: "year",
      academicTermId: "term",
      authorMembershipId: "teacher",
      title: "Work",
      instructions: "Answer",
      totalMarks: 10,
      dueAt: now,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
      status: "published",
      version: 2,
      submissions: attempt ? [previous] : [],
    };
    const tx = {},
      sams = {
        getAuthorizedContext: jest
          .fn()
          .mockResolvedValue({
            student: { id: "student" },
            classes: [{ id: "class" }],
          }),
      };
    const records = {
      run: jest.fn((_a, work) => work(tx)),
      consume: jest.fn().mockResolvedValue(true),
      lock: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue(task),
      create: jest
        .fn()
        .mockResolvedValue({
          ...previous,
          attempt: attempt + 1,
          text: "New answer",
        }),
    };
    return {
      records,
      tx,
      previous,
      service: new StudentWorkService(sams as never, records as never),
    };
  }
  it("derives Student identity and next attempt server-side inside the locked write", async () => {
    const { service, records, tx } = mutations();
    await service.submit(actor as never, "assignment", {
      text: " New answer ",
      expectedAttempt: 0,
    });
    expect(records.lock).toHaveBeenCalledWith(tx, "student");
    expect(records.create).toHaveBeenCalledWith(
      tx,
      actor,
      expect.objectContaining({ id: "assignment" }),
      "student",
      expect.any(String),
      "New answer",
      1,
    );
  });
  it("returns a recent identical attempt without adding another write", async () => {
    const { service, records, previous } = mutations(1);
    expect(
      await service.submit(actor as never, "assignment", {
        text: previous.text,
        expectedAttempt: 0,
      }),
    ).toMatchObject({ duplicate: true });
    expect(records.create).not.toHaveBeenCalled();
  });
  it("rejects a stale expected attempt", async () => {
    const { service, records } = mutations(1);
    await expect(
      service.submit(actor as never, "assignment", {
        text: "New answer",
        expectedAttempt: 0,
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(records.create).not.toHaveBeenCalled();
  });
  it("retains three attempts and rejects a fourth", async () => {
    const { service, records } = mutations(3);
    await expect(
      service.submit(actor as never, "assignment", {
        text: "New answer",
        expectedAttempt: 3,
      }),
    ).rejects.toMatchObject({ code: "ATTEMPTS_EXHAUSTED" });
    expect(records.create).not.toHaveBeenCalled();
  });
});
