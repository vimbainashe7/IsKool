import {
  BusinessRuleError,
  PermissionDeniedError,
} from "../../../common/errors/application-error";
import {
  requireTeacher,
  validatePublication,
  validateDraft,
} from "../assignment.policy";

describe("Teacher assignment invariants", () => {
  it("requires an APS Teacher before any class or database operation", () => {
    expect(() =>
      requireTeacher({ scope: "aps", roles: ["student"] } as never),
    ).toThrow(PermissionDeniedError);
    expect(() =>
      requireTeacher({ scope: "sams", roles: ["teacher"] } as never),
    ).toThrow(PermissionDeniedError);
    expect(() =>
      requireTeacher({ scope: "aps", roles: ["teacher"] } as never),
    ).not.toThrow();
  });
  it("rejects blank content, invalid marks and dates", () => {
    const valid = {
      title: "Algebra",
      instructions: "Show your working.",
      totalMarks: 20,
      dueAt: "2026-11-01T12:00:00.000Z",
    };
    expect(() => validateDraft(valid)).not.toThrow();
    for (const change of [
      { title: " " },
      { instructions: " " },
      { totalMarks: 0 },
      { totalMarks: 20.123 },
      { dueAt: "invalid" },
    ])
      expect(() => validateDraft({ ...valid, ...change })).toThrow(
        BusinessRuleError,
      );
  });
  it("publishes only a saved draft with a future deadline", () => {
    const now = new Date("2026-10-21T12:00:00Z");
    expect(() =>
      validatePublication("draft", new Date("2026-10-22"), now),
    ).not.toThrow();
    expect(() =>
      validatePublication("published", new Date("2026-10-22"), now),
    ).toThrow(BusinessRuleError);
    expect(() => validatePublication("draft", now, now)).toThrow(
      BusinessRuleError,
    );
  });
});
