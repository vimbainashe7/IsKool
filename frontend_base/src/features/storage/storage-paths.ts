type AssignmentSubmissionPathInput = {
  schoolId: string
  classId: string
  assignmentId: string
  userId: string
  extension?: string
}

type TeacherMaterialPathInput = {
  schoolId: string
  classId: string
  userId: string
  extension?: string
}

function cleanSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-")
}

function extensionFromFileName(fileName: string) {
  const extension = fileName.split(".").pop()
  return extension && extension !== fileName
    ? cleanSegment(extension.toLowerCase())
    : "bin"
}

export function buildAssignmentSubmissionPath(
  input: AssignmentSubmissionPathInput
) {
  const extension = input.extension ? cleanSegment(input.extension) : "bin"
  return [
    "schools",
    cleanSegment(input.schoolId),
    "classes",
    cleanSegment(input.classId),
    "assignments",
    cleanSegment(input.assignmentId),
    "students",
    cleanSegment(input.userId),
    `${crypto.randomUUID()}.${extension}`,
  ].join("/")
}

export function buildTeacherMaterialPath(input: TeacherMaterialPathInput) {
  const extension = input.extension ? cleanSegment(input.extension) : "bin"
  return [
    "schools",
    cleanSegment(input.schoolId),
    "classes",
    cleanSegment(input.classId),
    "materials",
    cleanSegment(input.userId),
    `${crypto.randomUUID()}.${extension}`,
  ].join("/")
}

export function getSafeExtension(fileName: string) {
  return extensionFromFileName(fileName)
}
