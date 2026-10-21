import { AuthPrincipal } from "@aps-sams/auth";
import {
  BusinessRuleError,
  PermissionDeniedError,
} from "../../common/errors/application-error";

export function requireTeacher(p: AuthPrincipal) {
  if (p.scope !== "aps" || !p.roles.includes("teacher"))
    throw new PermissionDeniedError();
}
export function validateDraft(d: {
  title: string;
  instructions: string;
  totalMarks: number;
  dueAt: string;
}) {
  if (
    !d.title.trim() ||
    d.title.length > 160 ||
    !d.instructions.trim() ||
    d.instructions.length > 10000 ||
    !Number.isFinite(d.totalMarks) ||
    d.totalMarks <= 0 ||
    d.totalMarks > 1000 ||
    Math.abs(d.totalMarks * 100 - Math.round(d.totalMarks * 100)) > 0.000001 ||
    !Number.isFinite(Date.parse(d.dueAt))
  )
    throw new BusinessRuleError(
      "INVALID_ASSIGNMENT",
      "Enter a title, instructions, deadline and marks between 0.01 and 1000 (at most two decimal places).",
    );
}
export function validatePublication(
  status: string,
  dueAt: Date,
  now = new Date(),
) {
  if (status !== "draft")
    throw new BusinessRuleError(
      "ASSIGNMENT_NOT_DRAFT",
      "Only a saved draft can be published.",
    );
  if (dueAt <= now)
    throw new BusinessRuleError(
      "DEADLINE_PASSED",
      "Choose a future deadline before publishing.",
    );
}
