import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { SubmitWorkDto } from "../student-work.dto";
describe("Submission runtime contract", () => {
  const check = (body: unknown) =>
    validate(plainToInstance(SubmitWorkDto, body), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
  it("accepts a text answer and an explicit prior attempt", async () => {
    expect(await check({ text: "Answer", expectedAttempt: 0 })).toHaveLength(0);
  });
  it.each([
    { text: "", expectedAttempt: 0 },
    { text: "Answer", expectedAttempt: -1 },
    { text: "Answer", expectedAttempt: 1.5 },
    { text: "Answer", expectedAttempt: 4 },
    { text: "Answer", expectedAttempt: 0, studentId: "forged" },
    { text: "Answer", expectedAttempt: 0, submittedAt: "forged" },
  ])("rejects invalid or client-owned security fields %j", async (body) => {
    expect((await check(body)).length).toBeGreaterThan(0);
  });
});
