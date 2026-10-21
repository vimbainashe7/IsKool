import { expect, test, type Page } from "@playwright/test"
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
async function signIn(page: Page, role: "Admin" | "Student" | "Teacher") {
  if (!password) throw Error("Private development credential required.")
  await page.goto("/sign-in")
  await page.getByRole("button", { name: role, exact: true }).click()
  try {
    await page.getByLabel("Password", { exact: true }).fill(password)
  } catch {
    throw Error("Could not enter private development credential.")
  }
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(page).toHaveURL(
    new RegExp(`/${role.toLowerCase()}/dashboard$`),
    { timeout: 120_000 }
  )
}
async function logout(page: Page) {
  await page.getByRole("button", { name: "Profile menu" }).click()
  await page.getByRole("button", { name: "Sign out", exact: true }).click()
  await expect(page).toHaveURL(/\/sign-in$/)
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
test.describe("live authoritative dashboards", () => {
  test.skip(
    !live,
    "Requires approved development services and an existing linked Student and assigned Teacher class."
  )
  test("enrollment changes update Admin and Teacher dashboards; Student sees own persisted class context", async ({
    page,
  }, info) => {
    test.setTimeout(900_000)
    await signIn(page, "Student")
    const studentResponse = await page.request.get("/api/workspace")
    expect(studentResponse.status()).toBe(200)
    const studentContext = (await studentResponse.json()).academicContext
    expect(studentContext.role).toBe("student")
    expect(studentContext.classes.length).toBeGreaterThan(0)
    await expect(
      page.getByRole("heading", {
        level: 3,
        name: studentContext.classes[0].name,
        exact: true,
      })
    ).toBeVisible()
    await expect(
      page.getByText("Assignments are not available yet.", { exact: true })
    ).toBeVisible()
    await page.reload()
    await expect(
      page.getByRole("heading", {
        level: 3,
        name: studentContext.classes[0].name,
        exact: true,
      })
    ).toBeVisible({ timeout: 120_000 })
    await logout(page)
    await signIn(page, "Teacher")
    const teacherResponse = await page.request.get("/api/workspace")
    expect(teacherResponse.status()).toBe(200)
    const teacherContext = (await teacherResponse.json()).academicContext
    const schoolClass = teacherContext.classes.find(
      (c: { terms: unknown[] }) => c.terms.length > 0
    )
    expect(
      schoolClass,
      "An assigned class in a current term is required"
    ).toBeTruthy()
    expect(teacherContext.schoolId).toBe(studentContext.schoolId)
    const classCard = () =>
      page
        .getByRole("link")
        .filter({
          has: page.getByRole("heading", {
            level: 3,
            name: schoolClass.name,
            exact: true,
          }),
        })
    const countLabel = (n: number) =>
      `${n} active ${n === 1 ? "student" : "students"}`
    await expect(classCard()).toContainText(
      countLabel(schoolClass.studentCount)
    )
    await expect(
      page.getByText("Submission review is not available yet.", { exact: true })
    ).toBeVisible()
    await logout(page)
    await signIn(page, "Admin")
    const summaryResponse = await page.request.get(
      "/api/sams/student-administration/summary"
    )
    expect(summaryResponse.status()).toBe(200)
    const baseline = await summaryResponse.json()
    await page.goto("/admin/students")
    const suffix = Date.now().toString()
    await page
      .getByLabel("Admission number", { exact: true })
      .fill(`DASH-${suffix}`)
    await page.getByLabel("Given name", { exact: true }).fill("Dashboard")
    await page
      .getByLabel("Family name", { exact: true })
      .fill(`Verification ${suffix}`)
    const student = await save(page, "Create student", "students")
    await page.goto(`/admin/students/${student.id}`)
    await page.getByLabel("Class", { exact: true }).selectOption(schoolClass.id)
    await page
      .getByLabel("Academic term", { exact: true })
      .selectOption(schoolClass.terms[0].id)
    await page
      .getByLabel("Enrollment status", { exact: true })
      .selectOption("active")
    const enrollment = await save(
      page,
      "Enroll student",
      `students/${student.id}/enrollments`
    )
    await page.goto("/admin/dashboard")
    await expect(
      page.getByTestId("metric-Students").locator("strong")
    ).toHaveText(String(baseline.students + 1))
    await expect(
      page.getByTestId("metric-Enrolled Students").locator("strong")
    ).toHaveText(String(baseline.enrolledStudents + 1))
    await page.reload()
    await expect(
      page.getByTestId("metric-Enrolled Students").locator("strong")
    ).toHaveText(String(baseline.enrolledStudents + 1))
    await logout(page)
    await signIn(page, "Teacher")
    await expect(classCard()).toContainText(
      countLabel(schoolClass.studentCount + 1)
    )
    await page.reload()
    await expect(classCard()).toContainText(
      countLabel(schoolClass.studentCount + 1)
    )
    await logout(page)
    await signIn(page, "Admin")
    await page.goto(`/admin/students/${student.id}`)
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
    await page.goto("/admin/dashboard")
    await expect(
      page.getByTestId("metric-Enrolled Students").locator("strong")
    ).toHaveText(String(baseline.enrolledStudents))
    await logout(page)
    await signIn(page, "Teacher")
    await expect(classCard()).toContainText(
      countLabel(schoolClass.studentCount)
    )
    await logout(page)
    await info.attach("persisted-dashboard-evidence", {
      body: JSON.stringify({
        studentId: student.id,
        classId: schoolClass.id,
        enrollmentId: enrollment.id,
        baselineStudents: baseline.students,
        initialClassCount: schoolClass.studentCount,
        created: true,
        enrolled: true,
        teacherReload: true,
        withdrawn: true,
      }),
      contentType: "application/json",
    })
  })
})
