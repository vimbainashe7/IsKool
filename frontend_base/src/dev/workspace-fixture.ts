import type { Workspace } from "@/features/workspace/contracts"
export function createWorkspaceFixture(count = 30): Workspace {
  const students = Array.from({ length: count }, (_, i) => ({
    id: `student-${i + 1}`,
    name: `Learner ${String(i + 1).padStart(3, "0")}`,
    status: "active" as const,
    roles: ["student" as const],
  }))
  const now = Date.now()
  return {
    asOf: new Date(now).toISOString(),
    mode: "demo",
    userId: "demo-teacher",
    membershipId: "teacher-1",
    schoolId: "00000000-0000-0000-0000-000000000001",
    classes: [
      {
        id: "class-1",
        name: "Mathematics 4A",
        subject: "Mathematics",
        yearLevel: "Form 4",
      },
      {
        id: "class-2",
        name: "English 4A",
        subject: "English",
        yearLevel: "Form 4",
      },
    ],
    assignments: [
      {
        id: "assignment-1",
        classId: "class-1",
        title: "Algebra: simultaneous equations",
        instructions:
          "Solve the five simultaneous equations and show every step of your working. Upload your answers as a PDF.",
        totalMarks: 50,
        dueAt: new Date(now + 86400000).toISOString(),
        latePolicy: "allow",
        resubmission: false,
        status: "published",
        attachment: "",
        attachmentPath: "",
      },
      {
        id: "assignment-2",
        classId: "class-2",
        title: "Reading reflection",
        instructions: "Write a reflection on the passage discussed in class.",
        totalMarks: 20,
        dueAt: new Date(now - 86400000).toISOString(),
        latePolicy: "deny",
        resubmission: false,
        status: "published",
        attachment: "",
        attachmentPath: "",
      },
    ],
    submissions: students
      .slice(1)
      .map((student) => ({
        id: `submission-${student.id}`,
        assignmentId: "assignment-1",
        studentId: student.id,
        filename: "answers.pdf",
        submittedAt: new Date(now - 3600000).toISOString(),
        status: "submitted" as const,
        filePath: "demo/answers.pdf",
      })),
    grades: [],
    materials: [
      {
        id: "material-1",
        classId: "class-1",
        title: "Algebra worked examples",
        topic: "Simultaneous equations",
        filename: "algebra.pdf",
        status: "published",
        filePath: "demo/algebra.pdf",
      },
    ],
    members: [
      ...students,
      {
        id: "teacher-1",
        name: "Demo Teacher",
        status: "active",
        roles: ["teacher", "admin"],
      },
      {
        id: "admin-2",
        name: "School administrator",
        status: "active",
        roles: ["admin"],
      },
      {
        id: "invited-1",
        name: "Pending invitation",
        status: "invited",
        roles: ["teacher"],
      },
    ],
    enrollments: students.flatMap((member) =>
      ["class-1", "class-2"].map((classId) => ({
        classId,
        memberId: member.id,
      }))
    ),
    teachers: [
      { classId: "class-1", memberId: "teacher-1" },
      { classId: "class-2", memberId: "teacher-1" },
    ],
    timetable: [
      {
        id: "slot-1",
        classId: "class-1",
        weekday: new Date().getDay() || 7,
        start: "08:00",
        end: "09:00",
        room: "Room 4",
      },
    ],
    notifications: [
      {
        id: "notification-1",
        title: "New assignment",
        body: "Your class has new work to review.",
        href: "/assignments",
      },
    ],
    jobs: [],
    drafts: [],
    audit: [],
    warnings: [],
  }
}
