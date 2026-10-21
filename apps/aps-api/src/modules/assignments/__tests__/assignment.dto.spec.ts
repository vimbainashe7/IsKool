import { ValidationPipe } from "@nestjs/common";
import { CreateAssignmentDto, UpdateAssignmentDto } from "../assignment.dto";
const input = {
  classId: "a8000000-0000-4000-8000-000000000001",
  academicTermId: "a7000000-0000-4000-8000-000000000001",
  title: "Algebra",
  instructions: "Show working",
  totalMarks: 20.5,
  dueAt: "2026-11-01T12:00:00Z",
};
describe("Assignment HTTP validation", () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  it("accepts a typed draft", async () => {
    await expect(
      pipe.transform(input, { type: "body", metatype: CreateAssignmentDto }),
    ).resolves.toBeInstanceOf(CreateAssignmentDto);
  });
  it.each([
    { schoolId: "foreign" },
    { authorMembershipId: "other" },
    { publishedAt: "2026-10-21T12:00:00Z" },
    { status: "published" },
    { totalMarks: 20.123 },
  ])(
    "rejects forged context/publication and invalid precision %j",
    async (change) => {
      await expect(
        pipe.transform(
          { ...input, ...change },
          { type: "body", metatype: CreateAssignmentDto },
        ),
      ).rejects.toThrow();
    },
  );
  it("requires a valid version for edits", async () => {
    const { classId, academicTermId, ...fields } = input;
    void classId;
    void academicTermId;
    await expect(
      pipe.transform(
        { ...fields, version: 0 },
        { type: "body", metatype: UpdateAssignmentDto },
      ),
    ).rejects.toThrow();
  });
});
