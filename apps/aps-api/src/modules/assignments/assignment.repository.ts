import { Injectable } from "@nestjs/common";
import { Assignment, Prisma } from "@prisma/client";
import {
  TransactionClient,
  TransactionService,
} from "../../database/transaction/transaction.service";
import {
  ApplicationError,
  BusinessRuleError,
  ConflictError,
} from "../../common/errors/application-error";
import { AuditService } from "../audit/audit.service";
import { SamsActor } from "../sams-client/sams.client";
import { AssignmentListQuery, DraftFields } from "./assignment.dto";
export function assignmentView(row: Assignment) {
  return {
    ...row,
    totalMarks: Number(row.totalMarks),
    dueAt: row.dueAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
@Injectable()
export class AssignmentRepository {
  constructor(
    private readonly transactions: TransactionService,
    private readonly audit: AuditService,
  ) {}
  async run<T>(
    actor: SamsActor,
    work: (tx: TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.transactions.runWithPrincipal(
        { ...actor.principal, requestId: actor.requestId },
        work,
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2028")
          throw new ApplicationError(
            "ASSIGNMENTS_BUSY",
            "Assignments could not be verified. Please reload before retrying.",
            503,
          );
        if (["P2003", "P2004"].includes(error.code))
          throw new BusinessRuleError(
            "INVALID_ASSIGNMENT_CONTEXT",
            "Check the class, term, deadline and your current teaching access.",
          );
      }
      throw error;
    }
  }
  list(tx: TransactionClient, actor: SamsActor, q: AssignmentListQuery) {
    return tx.assignment.findMany({
      where: {
        schoolId: actor.principal.schoolId,
        authorMembershipId: actor.principal.membershipId,
        ...(q.cursor ? { id: { gt: q.cursor } } : {}),
      },
      orderBy: { id: "asc" },
      take: q.limit + 1,
    });
  }
  summary(tx: TransactionClient, actor: SamsActor) {
    return tx.assignment.groupBy({
      by: ["status"],
      where: {
        schoolId: actor.principal.schoolId,
        authorMembershipId: actor.principal.membershipId,
      },
      _count: { _all: true },
    });
  }
  find(tx: TransactionClient, actor: SamsActor, id: string) {
    return tx.assignment.findFirst({
      where: {
        id,
        schoolId: actor.principal.schoolId,
        authorMembershipId: actor.principal.membershipId,
      },
    });
  }
  create(
    tx: TransactionClient,
    actor: SamsActor,
    input: DraftFields & {
      classId: string;
      academicYearId: string;
      academicTermId: string;
    },
  ) {
    return tx.assignment.create({
      data: {
        ...input,
        title: input.title.trim(),
        instructions: input.instructions.trim(),
        dueAt: new Date(input.dueAt),
        schoolId: actor.principal.schoolId,
        authorMembershipId: actor.principal.membershipId,
      },
    });
  }
  async update(
    tx: TransactionClient,
    actor: SamsActor,
    before: Assignment,
    data: Prisma.AssignmentUpdateManyMutationInput,
  ) {
    const result = await tx.assignment.updateMany({
      where: {
        id: before.id,
        schoolId: actor.principal.schoolId,
        authorMembershipId: actor.principal.membershipId,
        version: before.version,
        status: before.status,
      },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count !== 1)
      throw new ConflictError(
        "This assignment changed or your teaching access changed. Reload before saving.",
      );
    return tx.assignment.findFirstOrThrow({ where: { id: before.id } });
  }
  record(
    tx: TransactionClient,
    actor: SamsActor,
    action: string,
    after: Assignment,
    before?: Assignment,
  ) {
    return this.audit.record(tx, {
      actorUserId: actor.principal.userId,
      actorMembershipId: actor.principal.membershipId,
      schoolId: actor.principal.schoolId,
      action,
      entityType: "assignment",
      entityId: after.id,
      beforeValue: before ? assignmentView(before) : undefined,
      afterValue: assignmentView(after),
      requestId: actor.requestId,
    });
  }
}
