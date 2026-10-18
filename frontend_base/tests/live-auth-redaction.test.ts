import { mkdtempSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, it, vi } from "vitest"
import type { TestCase, TestResult } from "@playwright/test/reporter"
import LiveAuthRedactionReporter from "./live-auth-redaction-reporter"

it("removes a private fixture value from failure files, steps and report errors", () => {
  const directory = mkdtempSync(join(tmpdir(), "iskool-report-test-"))
  const file = join(directory, "error-context.md")
  const secret = "private-unit-fixture-value"
  vi.stubEnv("ISKOOL_TEST_PASSWORD", secret)
  try {
    writeFileSync(file, `password field: ${secret}`)
    const result = {
      errors: [{ message: `Fill ${secret}`, errorContext: `Password: ${secret}` }],
      steps: [{ title: `Fill ${secret}` }],
      attachments: [{ name: "error-context", contentType: "text/markdown", path: file }],
    } as unknown as TestResult
    new LiveAuthRedactionReporter().onTestEnd({} as TestCase, result)
    expect(JSON.stringify(result)).not.toContain(secret)
    expect(readFileSync(file, "utf8")).toBe("password field: [REDACTED]")
  } finally {
    vi.unstubAllEnvs()
    unlinkSync(file)
    rmdirSync(directory)
  }
})
