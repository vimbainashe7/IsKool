export type TeacherAiTool = "compile-notes" | "create-test" | "create-assignment"

export type TeacherAiRequest = {
  tool: TeacherAiTool
  prompt: string
  schoolId: string
  requestedBy: string
}

export type TeacherAiDraft = {
  title: string
  body: string
  status: "draft"
}

export interface TeacherAiProvider {
  generateDraft(input: TeacherAiRequest): Promise<TeacherAiDraft>
}
