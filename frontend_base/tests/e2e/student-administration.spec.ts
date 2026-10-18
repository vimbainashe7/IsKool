import { expect, test, type Page } from "@playwright/test"
import { writeFileSync } from "node:fs"
const live = process.env.ISKOOL_LIVE_AUTH === "true"
const password = process.env.ISKOOL_TEST_PASSWORD
if (live) process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1"
test.use({ trace: "off", actionTimeout: 90_000, navigationTimeout: 120_000 })
test.afterEach(async ({ page }, info) => {
  if (!live || !password) return
  for (const error of info.errors) {
    if (error.message)
      error.message = error.message.split(password).join("[REDACTED]")
    if (error.errorContext)
      error.errorContext = error.errorContext.split(password).join("[REDACTED]")
  }
  await page
    .locator('input[type="password"]')
    .evaluateAll((inputs) => {
      for (const input of inputs) (input as HTMLInputElement).value = ""
    })
    .catch(() => undefined)
})
async function signIn(page: Page, role: "Admin" | "Teacher" | "Student") {
  if (!password) throw new Error("Private development credential required.")
  await page.goto("/sign-in")
  await page.getByRole("button", { name: role, exact: true }).click()
  try {
    await page.getByLabel("Development seed password").fill(password)
  } catch {
    throw new Error("Could not enter private development credential.")
  }
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(page).toHaveURL(
    new RegExp(`/${role.toLowerCase()}/dashboard$`),
    { timeout: 120_000 }
  )
}
async function save(
  page: Page,
  button: string,
  path: string,
  method = "POST",
  status = 201
) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === `/api/sams/${path}` &&
        r.request().method() === method,
      { timeout: 90_000 }
    ),
    page.getByRole("button", { name: button, exact: true }).click(),
  ])
  expect(response.status(), "Real SAMS mutation must succeed").toBe(status)
  return response.json()
}
async function logout(page: Page) {
  await page.getByRole("button", { name: "Profile menu" }).click()
  await page.getByRole("button", { name: "Sign out", exact: true }).click()
  await expect(page).toHaveURL(/\/sign-in$/)
}

test.describe("live SAMS student administration", () => {
  test.skip(
    !live,
    "Requires the real local services and approved development database."
  )
  test("Admin creates calendar, student, guardian and enrollment; edits, withdraws and reloads", async ({
    page,
  }, info) => {
    test.setTimeout(600_000)
    const suffix = Date.now().toString()
    await signIn(page, "Admin")
    await page.goto("/admin/students")
    await expect(
      page.getByRole("heading", { name: "School student records", exact: true })
    ).toBeVisible({ timeout: 120_000 })
    await page.getByText("Create academic year", { exact: true }).click()
    await page.getByLabel("Year label", { exact: true }).fill(`Pilot ${suffix}`)
    await page.getByLabel("Year start", { exact: true }).fill("2026-01-01")
    await page.getByLabel("Year end", { exact: true }).fill("2026-12-31")
    const year = await save(
      page,
      "Save academic year",
      "student-administration/academic-years"
    )
    await page.getByText("Create academic term", { exact: true }).click()
    await page
      .getByLabel("Term academic year", { exact: true })
      .selectOption(year.id)
    await page
      .getByLabel("Term label", { exact: true })
      .fill(`Term 3 ${suffix}`)
    await page.getByLabel("Term start", { exact: true }).fill("2026-09-01")
    await page.getByLabel("Term end", { exact: true }).fill("2026-12-20")
    const term = await save(
      page,
      "Save academic term",
      "student-administration/academic-terms"
    )
    await page.getByText("Create school class", { exact: true }).click()
    await page
      .getByLabel("Class academic year", { exact: true })
      .selectOption(year.id)
    await page
      .getByLabel("Class name", { exact: true })
      .fill(`Form 1 Pilot ${suffix}`)
    const schoolClass = await save(
      page,
      "Save school class",
      "student-administration/classes"
    )
    const admissionNumber = `PILOT-${suffix}`
    await page
      .getByLabel("Admission number", { exact: true })
      .fill(admissionNumber)
    await page.getByLabel("Given name", { exact: true }).fill("Pilot")
    await page
      .getByLabel("Family name", { exact: true })
      .fill(`Learner ${suffix}`)
    const student = await save(page, "Create student", "students")
    const row = page.getByRole("listitem").filter({ hasText: admissionNumber })
    await expect(row).toBeVisible()
    await row.getByRole("link", { name: "Open record", exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/admin/students/${student.id}$`), { timeout: 120_000 })
    await expect(
      page.getByRole("heading", { name: "Guardians", exact: true })
    ).toBeVisible({ timeout: 120_000 })
    await page.getByText("Add a new guardian", { exact: true }).click()
    const guardianName = `Pilot Guardian ${suffix}`
    await page
      .getByLabel("Guardian full name", { exact: true })
      .fill(guardianName)
    await page
      .getByLabel("Guardian email", { exact: true })
      .fill(`guardian.${suffix}@example.test`)
    await page
      .getByLabel("Guardian phone (optional)", { exact: true })
      .fill("+263770000000")
    const guardian = await save(page, "Create guardian", "guardians")
    await page
      .getByLabel("Existing guardian", { exact: true })
      .selectOption(guardian.id)
    await page
      .getByLabel("Relationship", { exact: true })
      .selectOption("parent")
    await save(page, "Link guardian", `students/${student.id}/guardians`)
    await expect(page.getByText(guardianName, { exact: true })).toBeVisible()
    await page.getByLabel("Class", { exact: true }).selectOption(schoolClass.id)
    await page
      .getByLabel("Academic term", { exact: true })
      .selectOption(term.id)
    await page
      .getByLabel("Enrollment status", { exact: true })
      .selectOption("active")
    const enrollment = await save(
      page,
      "Enroll student",
      `students/${student.id}/enrollments`
    )
    await expect(
      page.getByTestId(`enrollment-${enrollment.id}-status`)
    ).toHaveText("active")
    await page.reload()
    await expect(page.getByText(guardianName, { exact: true })).toBeVisible({
      timeout: 120_000,
    })
    const updatedName = `Pilot Updated ${suffix}`
    await page.getByLabel("Given name", { exact: true }).fill(updatedName)
    await save(
      page,
      "Save student details",
      `students/${student.id}`,
      "PATCH",
      200
    )
    await expect(
      page.getByRole("status").filter({ hasText: "Student record saved." })
    ).toBeVisible()
    await page.reload()
    await expect(page.getByLabel("Given name", { exact: true })).toHaveValue(
      updatedName,
      { timeout: 120_000 }
    )
    await page
      .getByLabel("New enrollment status", { exact: true })
      .selectOption("withdrawn")
    await save(
      page,
      "Change enrollment status",
      `student-administration/enrollments/${enrollment.id}`,
      "PATCH",
      200
    )
    await expect(
      page.getByTestId(`enrollment-${enrollment.id}-status`)
    ).toHaveText("withdrawn")
    await page.reload()
    await expect(
      page.getByTestId(`enrollment-${enrollment.id}-status`)
    ).toHaveText("withdrawn", { timeout: 120_000 })
    const headers = { origin: new URL(page.url()).origin }
    const revival = await page.request.patch(
      `/api/sams/student-administration/enrollments/${enrollment.id}`,
      { headers, data: { status: "active", version: 2 } }
    )
    expect(revival.status()).toBe(422)
    const stale = await page.request.patch(`/api/sams/students/${student.id}`, {
      headers,
      data: { givenName: "Stale", version: 1 },
    })
    expect(stale.status()).toBe(409)
    await page.screenshot({
      path: info.outputPath("student-detail-persisted.png"),
      fullPage: true,
    })
    await page.setViewportSize({ width: 390, height: 844 })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true)
    await page.screenshot({
      path: info.outputPath("student-detail-mobile.png"),
      fullPage: true,
    })
    writeFileSync(
      info.outputPath("student-record.json"),
      JSON.stringify({
        studentId: student.id,
        guardianId: guardian.id,
        enrollmentId: enrollment.id,
        admissionNumber,
        updatedName,
        classId: schoolClass.id,
        termId: term.id,
        yearId: year.id,
      })
    )
    await logout(page)
  })

  test("wrong-school records and Teacher/Student mutations are denied", async ({
    page,
  }) => {
    test.setTimeout(360_000)
    await signIn(page, "Admin")
    const betaLogin = await page.request.post(
      "http://127.0.0.1:3002/api/v1/auth/login",
      { data: { email: "registrar.beta@example.test", password } }
    )
    expect(betaLogin.status()).toBe(201)
    const beta = await betaLogin.json()
    const betaHeaders = { authorization: `Bearer ${beta.accessTokens.sams}` }
    try {
      const betaCreate = await page.request.post(
        "http://127.0.0.1:3002/api/v1/students",
        {
          headers: betaHeaders,
          data: {
            admissionNumber: `BETA-${Date.now()}`,
            givenName: "Isolation",
            familyName: "Beta",
          },
        }
      )
      expect(betaCreate.status()).toBe(201)
      const student = await betaCreate.json()
      const headers = { origin: new URL(page.url()).origin }
      expect(
        (await page.request.get(`/api/sams/students/${student.id}`)).status()
      ).toBe(404)
      expect(
        (
          await page.request.patch(`/api/sams/students/${student.id}`, {
            headers,
            data: { givenName: "Intrusion", version: 1 },
          })
        ).status()
      ).toBe(404)
    } finally {
      await page.request.post("http://127.0.0.1:3002/api/v1/auth/logout", {
        headers: betaHeaders,
      })
    }
    await logout(page)
    for (const role of ["Teacher", "Student"] as const) {
      await signIn(page, role)
      const read = await page.request.get("/api/sams/students")
      expect([401, 403]).toContain(read.status())
      const mutation = await page.request.post("/api/sams/students", {
        headers: { origin: new URL(page.url()).origin },
        data: {
          admissionNumber: `DENIED-${Date.now()}`,
          givenName: "Must",
          familyName: "Fail",
        },
      })
      expect([401, 403]).toContain(mutation.status())
      await logout(page)
    }
  })
})
