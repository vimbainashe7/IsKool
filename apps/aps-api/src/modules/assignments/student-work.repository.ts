import { Injectable } from "@nestjs/common";
import { Assignment, Submission } from "@prisma/client";
import { TransactionClient } from "../../database/transaction/transaction.service";
import { AssignmentRepository } from "./assignment.repository";
import { AuditService } from "../audit/audit.service";
import { SamsActor } from "../sams-client/sams.client";
import { AssignmentListQuery } from "./assignment.dto";
export const submissionView = (s: Submission) => ({
  id: s.id,
  assignmentId: s.assignmentId,
  schoolId: s.schoolId,
  studentId: s.studentId,
  studentMembershipId: s.studentMembershipId,
  text: s.text,
  attempt: s.attempt,
  status: s.status,
  submittedAt: s.submittedAt.toISOString(),
});
@Injectable()
export class StudentWorkRepository {
  constructor(
    private readonly assignments: AssignmentRepository,
    private readonly audit: AuditService,
  ) {}
  run<T>(a: SamsActor, work: (tx: TransactionClient) => Promise<T>) {
    return this.assignments.run(a, work);
  }
  consume(a: SamsActor, studentId: string, token: string) {
    return this.run(a, async (tx) => {
      const [r] = await tx.$queryRaw<
        Array<{ allowed: boolean }>
      >`SELECT iskool.consume_submission_request(${studentId}::uuid,${token}::uuid) AS allowed`;
      return r.allowed;
    });
  }
  list(tx: TransactionClient, a: SamsActor, q: AssignmentListQuery) {
    return tx.assignment.findMany({
      where: {
        schoolId: a.principal.schoolId,
        status: "published",
      },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      take: q.limit + 1,
      include: {
        submissions: {
          where: { studentMembershipId: a.principal.membershipId },
          orderBy: { attempt: "desc" },
          take: 1,
        },
      },
    });
  }
  find(tx: TransactionClient, a: SamsActor, id: string) {
    return tx.assignment.findFirst({
      where: { id, schoolId: a.principal.schoolId, status: "published" },
      include: {
        submissions: {
          where: { studentMembershipId: a.principal.membershipId },
          orderBy: { attempt: "desc" },
          take: 3,
        },
      },
    });
  }
  async lock(tx: TransactionClient, studentId: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${studentId},73053))`;
  }
  async create(
    tx: TransactionClient,
    a: SamsActor,
    task: Assignment,
    studentId: string,
    token: string,
    text: string,
    attempt: number,
  ) {
    const s = await tx.submission.create({
      data: {
        assignmentId: task.id,
        schoolId: a.principal.schoolId,
        studentMembershipId: a.principal.membershipId,
        studentId,
        requestToken: token,
        text,
        attempt,
        status: "submitted",
      },
    });
    await this.audit.record(tx, {
      actorUserId: a.principal.userId,
      actorMembershipId: a.principal.membershipId,
      schoolId: a.principal.schoolId,
      action: "submission.created",
      entityType: "submission",
      entityId: s.id,
      afterValue: submissionView(s),
      requestId: a.requestId,
    });
    return s;
  }
}
