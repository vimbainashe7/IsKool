export function safeReturnPath(
  value: string | null | undefined,
  fallback = "/home"
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\r\n]/.test(value)
  )
    return fallback
  try {
    const parsed = new URL(value, "https://iskool.invalid")
    return parsed.origin === "https://iskool.invalid"
      ? parsed.pathname + parsed.search
      : fallback
  } catch {
    return fallback
  }
}
