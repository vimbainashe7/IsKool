import { readFileSync, writeFileSync } from "node:fs"
import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter"

export default class LiveAuthRedactionReporter implements Reporter {
  onTestEnd(_test: TestCase, result: TestResult) {
    const secret = process.env.ISKOOL_TEST_PASSWORD
    if (!secret) return
    const redact = (text: string) => text.split(secret).join("[REDACTED]")
    const seen = new WeakSet<object>()
    function scrub(value: object) {
      if (seen.has(value) || Buffer.isBuffer(value)) return
      seen.add(value)
      for (const [key, item] of Object.entries(value)) {
        if (typeof item === "string") (value as Record<string, unknown>)[key] = redact(item)
        else if (item && typeof item === "object") scrub(item)
      }
    }
    // Run before the list/HTML reporters serialize API-step titles and errors.
    scrub(result)
    for (const attachment of result.attachments) {
      if (attachment.body && attachment.contentType.startsWith("text/")) {
        attachment.body = Buffer.from(redact(attachment.body.toString()))
      }
      if (attachment.path && /\.(md|json|txt|html)$/.test(attachment.path)) {
        writeFileSync(attachment.path, redact(readFileSync(attachment.path, "utf8")))
      }
    }
  }
}
