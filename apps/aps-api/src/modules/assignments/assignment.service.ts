import { Injectable } from "@nestjs/common";
import { Assignment } from "@prisma/client";
import { SamsActor, SamsClient } from "../sams-client/sams.client";
import {
  BusinessRuleError,
  ConflictError,
  ResourceNotFoundError,
} from "../../common/errors/application-error";
import {
  AssignmentListQuery,
  CreateAssignmentDto,
  UpdateAssignmentDto,
} from "./assignment.dto";
import { AssignmentRepository, assignmentView } from "./assignment.repository";
import {
  requireTeacher,
  validateDraft,
  validatePublication,
} from "./assignment.policy";
@Injectable()
export class AssignmentService {
  constructor(
    private readonly sams: SamsClient,
    private readonly repository: AssignmentRepository,
  ) {}
  async list(a: SamsActor, q: AssignmentListQuery) {
    requireTeacher(a.principal);
    return this.repository.run(a, async (tx) => {
      const rows = await this.repository.list(tx, a, q),
        counts = await this.repository.summary(tx, a);
      return {
        schoolId: a.principal.schoolId,
        membershipId: a.principal.membershipId,
        items: rows.slice(0, q.limit).map(assignmentView),
        nextCursor: rows.length > q.limit ? rows[q.limit - 1].id : null,
        summary: {
          draft: counts.find((c) => c.status === "draft")?._count._all ?? 0,
          published:
            counts.find((c) => c.status === "published")?._count._all ?? 0,
          archived:
            counts.find((c) => c.status === "archived")?._count._all ?? 0,
        },
      };
    });
  }
  private async context(
    a: SamsActor,
    classId: string,
    termId: string,
    dueAt: string,
  ) {
    const context = await this.sams.getAuthorizedContext(a, {
      role: "teacher",
      classId,
      limit: 1,
    });
    const schoolClass = context.classes.find((c) => c.id === classId),
      term = schoolClass?.terms.find((t) => t.id === termId);
    if (!schoolClass || !term)
      throw new ResourceNotFoundError(
        "Class or academic term is not available to your teaching account.",
      );
    const day = new Date(Date.parse(dueAt) + 7200000)
      .toISOString()
      .slice(0, 10);
    if (day < term.startsOn.slice(0, 10) || day > term.endsOn.slice(0, 10))
      throw new BusinessRuleError(
        "DEADLINE_OUTSIDE_TERM",
        "The deadline must fall within the selected academic term (Africa/Harare).",
      );
    return schoolClass;
  }
  private async owned(a: SamsActor, id: string) {
    requireTeacher(a.principal);
    const row = await this.repository.run(a, (tx) =>
      this.repository.find(tx, a, id),
    );
    if (!row)
      throw new ResourceNotFoundError(
        "Assignment not found in your authorized teaching records.",
      );
    await this.context(
      a,
      row.classId,
      row.academicTermId,
      row.dueAt.toISOString(),
    );
    return row;
  }
  async get(a: SamsActor, id: string) {
    return assignmentView(await this.owned(a, id));
  }
  async create(a: SamsActor, d: CreateAssignmentDto) {
    requireTeacher(a.principal);
    validateDraft(d);
    const schoolClass = await this.context(
      a,
      d.classId,
      d.academicTermId,
      d.dueAt,
    );
    return this.repository.run(a, async (tx) => {
      const row = await this.repository.create(tx, a, {
        ...d,
        academicYearId: schoolClass.academicYear.id,
      });
      await this.repository.record(tx, a, "assignment.created", row);
      return assignmentView(row);
    });
  }
  private version(row: Assignment, version: number) {
    if (row.version !== version)
      throw new ConflictError(
        "This assignment has changed. Reload before saving.",
      );
  }
  async update(a: SamsActor, id: string, d: UpdateAssignmentDto) {
    validateDraft(d);
    const row = await this.owned(a, id);
    this.version(row, d.version);
    if (row.status !== "draft")
      throw new BusinessRuleError(
        "ASSIGNMENT_NOT_DRAFT",
        "Only drafts can be edited.",
      );
    await this.context(a, row.classId, row.academicTermId, d.dueAt);
    return this.repository.run(a, async (tx) => {
      const after = await this.repository.update(tx, a, row, {
        title: d.title.trim(),
        instructions: d.instructions.trim(),
        totalMarks: d.totalMarks,
        dueAt: new Date(d.dueAt),
      });
      await this.repository.record(tx, a, "assignment.updated", after, row);
      return assignmentView(after);
    });
  }
  async transition(
    a: SamsActor,
    id: string,
    version: number,
    status: "published" | "archived",
  ) {
    const row = await this.owned(a, id);
    this.version(row, version);
    if (status === "published") validatePublication(row.status, row.dueAt);
    else if (row.status === "archived")
      throw new BusinessRuleError(
        "ASSIGNMENT_ARCHIVED",
        "This assignment is already archived.",
      );
    return this.repository.run(a, async (tx) => {
      const after = await this.repository.update(tx, a, row, { status });
      await this.repository.record(tx, a, `assignment.${status}`, after, row);
      return assignmentView(after);
    });
  }
}
