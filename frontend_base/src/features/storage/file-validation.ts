const extensions = new Set(["pdf", "docx", "txt", "png", "jpg", "jpeg"])
export const maxFileBytes = 10 * 1024 * 1024
export function validateLearningFile(file: Pick<File, "name" | "size">) {
  if (!file.size) return "Choose a file that is not empty."
  if (file.size > maxFileBytes) return "Choose a file no larger than 10 MB."
  if (!extensions.has(file.name.split(".").pop()?.toLowerCase() ?? ""))
    return "Choose a PDF, DOCX, TXT, PNG or JPG file."
  return null
}
