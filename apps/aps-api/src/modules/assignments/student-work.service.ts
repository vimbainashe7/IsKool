import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { SamsActor, SamsClient } from "../sams-client/sams.client";
import {
  ApplicationError,
  BusinessRuleError,
  ConflictError,
  PermissionDeniedError,
  ResourceNotFoundError,
} from "../../common/errors/application-error";
import {
  StudentWorkRepository,
  submissionView,
} from "./student-work.repository";
import { AssignmentListQuery } from "./assignment.dto";
import { SubmitWorkDto } from "./student-work.dto";
import { assignmentView } from "./assignment.repository";
const policy = {
  maxAttempts: 3,
  lateAccepted: true,
  duplicateWindowSeconds: 30,
} as const;
@Injectable()
export class StudentWorkService {
  constructor(
    private readonly sams: SamsClient,
    private readonly records: StudentWorkRepository,
  ) {}
  private requireStudent(a: SamsActor) {
    if (a.principal.scope !== "aps" || !a.principal.roles.includes("student"))
      throw new PermissionDeniedError();
  }
  private async identity(a: SamsActor, classId?: string) {
    this.requireStudent(a);
    const context = await this.sams.getAuthorizedContext(a, {
      role: "student",
      limit: 1,
      classId,
    });
    if (
      !context.student ||
      (classId && !context.classes.some((c) => c.id === classId))
    )
      throw new ResourceNotFoundError(
        "Your student account or current enrollment could not be found.",
      );
    return context.student;
  }
  async list(a: SamsActor, q: AssignmentListQuery) {
    this.requireStudent(a);
    await this.sams.getAuthorizedContext(a, { role: "student", limit: 1 });
    return this.records.run(a, async (tx) => {
      const rows = await this.records.list(tx, a, q);
      return {
        schoolId: a.principal.schoolId,
        membershipId: a.principal.membershipId,
        policy,
        items: rows.slice(0, q.limit).map((r) => {
          const { submissions, ...task } = r;
          return {
            ...assignmentView(task),
            latestSubmission: submissions[0]
              ? submissionView(submissions[0])
              : null,
          };
        }),
        nextCursor: rows.length > q.limit ? rows[q.limit - 1].id : null,
      };
    });
  }
  async get(a: SamsActor, id: string) {
    this.requireStudent(a);
    const row = await this.records.run(a, (tx) => this.records.find(tx, a, id));
    if (!row)
      throw new ResourceNotFoundError(
        "Assignment is not available in your current enrollment.",
      );
    await this.identity(a, row.classId);
    const { submissions, ...task } = row;
    return {
      assignment: assignmentView(task),
      submissions: submissions.map(submissionView),
      policy,
    };
  }
  async submit(a: SamsActor, id: string, d: SubmitWorkDto) {
    const student = await this.identity(a),
      token = randomUUID();
    if (!(await this.records.consume(a, student.id, token)))
      throw new ApplicationError(
        "SUBMISSION_RATE_LIMIT",
        "You can send up to 10 submission requests per minute. Wait a minute and retry.",
        429,
      );
    const text = d.text.trim();
    if (!text)
      throw new BusinessRuleError(
        "EMPTY_SUBMISSION",
        "Write your answer before submitting.",
      );
    // No network calls while holding a database transaction or student lock.
    const context = await this.get(a, id);
    return this.records.run(a, async (tx) => {
      await this.records.lock(tx, student.id);
      const row = await this.records.find(tx, a, id);
      if (!row || row.classId !== context.assignment.classId)
        throw new ResourceNotFoundError(
          "This assignment is no longer available.",
        );
      const previous = row.submissions[0];
      if (
        previous &&
        previous.text === text &&
        previous.submittedAt.getTime() > Date.now() - 30000
      )
        return { submission: submissionView(previous), duplicate: true };
      if ((previous?.attempt ?? 0) !== d.expectedAttempt)
        throw new ConflictError(
          "Your submission changed. Reload before resubmitting.",
        );
      if ((previous?.attempt ?? 0) >= policy.maxAttempts)
        throw new BusinessRuleError(
          "ATTEMPTS_EXHAUSTED",
          "All three attempts have been used.",
        );
      const submission = await this.records.create(
        tx,
        a,
        row,
        student.id,
        token,
        text,
        (previous?.attempt ?? 0) + 1,
      );
      return { submission: submissionView(submission), duplicate: false };
    });
  }
}
