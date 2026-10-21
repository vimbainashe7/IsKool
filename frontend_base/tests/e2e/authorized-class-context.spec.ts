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
test.describe("live APS to SAMS authorized class context", () => {
  test.skip(!live, "Requires approved development services and real database.")
  test("Admin links and enrolls Student, assigns Teacher; both see persisted authorized classes; revocation removes access", async ({
    page,
  }, info) => {
    test.setTimeout(900_000)
    const suffix = Date.now().toString(),
      yearNumber = new Date().getFullYear(),
      className = `Context ${suffix}`
    // Only unlink this smoke's own earlier fixture; never take over an owner's record.
    await signIn(page, "Student")
    const previousResponse = await page.request.get(
      "/api/academic-context?role=student"
    )
    expect(previousResponse.status()).toBe(200)
    const previous = (await previousResponse.json()).student
    if (
      previous &&
      (!previous.admissionNumber.startsWith("CTX-") ||
        previous.givenName !== "Context")
    )
      throw new Error(
        "Student Alpha is linked to an owner-managed record. Do not reassign it through smoke testing."
      )
    await logout(page)
    await signIn(page, "Admin")
    if (previous) {
      await page.goto(`/admin/students/${previous.id}`)
      await expect(
        page.getByText(/Linked to .*student.alpha@example.test/)
      ).toBeVisible({ timeout: 120_000 })
      await page.getByLabel("Student account", { exact: true }).selectOption("")
      await save(
        page,
        "Save account link",
        `students/${previous.id}/account`,
        "PATCH",
        200
      )
      await page.reload()
      await expect(
        page.getByText("No sign-in account is linked.", { exact: true })
      ).toBeVisible({ timeout: 120_000 })
    }
    await page.goto("/admin/students")
    await page.getByText("Create academic year", { exact: true }).click()
    await page
      .getByLabel("Year label", { exact: true })
      .fill(`Context ${suffix}`)
    await page
      .getByLabel("Year start", { exact: true })
      .fill(`${yearNumber}-01-01`)
    await page
      .getByLabel("Year end", { exact: true })
      .fill(`${yearNumber}-12-31`)
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
      .fill(`Current ${suffix}`)
    await page
      .getByLabel("Term start", { exact: true })
      .fill(`${yearNumber}-01-01`)
    await page
      .getByLabel("Term end", { exact: true })
      .fill(`${yearNumber}-12-31`)
    const term = await save(
      page,
      "Save academic term",
      "student-administration/academic-terms"
    )
    await page.getByText("Create school class", { exact: true }).click()
    await page
      .getByLabel("Class academic year", { exact: true })
      .selectOption(year.id)
    await page.getByLabel("Class name", { exact: true }).fill(className)
    const schoolClass = await save(
      page,
      "Save school class",
      "student-administration/classes"
    )
    await page
      .getByLabel("Admission number", { exact: true })
      .fill(`CTX-${suffix}`)
    await page.getByLabel("Given name", { exact: true }).fill("Context")
    await page
      .getByLabel("Family name", { exact: true })
      .fill(`Student ${suffix}`)
    const student = await save(page, "Create student", "students")
    await page.goto(`/admin/students/${student.id}`)
    await page
      .getByLabel("Find student account", { exact: true })
      .fill("student.alpha@example.test")
    const studentChoice = page.getByLabel("Student account", { exact: true })
    await expect(
      studentChoice
        .locator("option")
        .filter({ hasText: "student.alpha@example.test" })
    ).toHaveCount(1, { timeout: 90_000 })
    await studentChoice.selectOption({
      label: await studentChoice
        .locator("option")
        .filter({ hasText: "student.alpha@example.test" })
        .innerText(),
    })
    await save(
      page,
      "Save account link",
      `students/${student.id}/account`,
      "PATCH",
      200
    )
    await page.reload()
    await expect(
      page.getByText(/Linked to .*student.alpha@example.test/)
    ).toBeVisible({ timeout: 120_000 })
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
    await page.goto("/admin/classes")
    await page
      .getByLabel("Find class for teaching", { exact: true })
      .fill(className)
    await expect(
      page
        .getByLabel("Class for teaching", { exact: true })
        .locator(`option[value="${schoolClass.id}"]`)
    ).toHaveCount(1, { timeout: 90_000 })
    await page
      .getByLabel("Class for teaching", { exact: true })
      .selectOption(schoolClass.id)
    await page
      .getByLabel("Find teacher account", { exact: true })
      .fill("teacher.alpha@example.test")
    const teacherChoice = page.getByLabel("Teacher account", { exact: true })
    await expect(
      teacherChoice
        .locator("option")
        .filter({ hasText: "teacher.alpha@example.test" })
    ).toHaveCount(1, { timeout: 90_000 })
    const membershipId = await teacherChoice
      .locator("option")
      .filter({ hasText: "teacher.alpha@example.test" })
      .getAttribute("value")
    await teacherChoice.selectOption(membershipId!)
    await save(
      page,
      "Assign teacher",
      `student-administration/classes/${schoolClass.id}/teachers`
    )
    await page.reload()
    await page
      .getByLabel("Find class for teaching", { exact: true })
      .fill(className)
    await expect(
      page
        .getByLabel("Class for teaching", { exact: true })
        .locator(`option[value="${schoolClass.id}"]`)
    ).toHaveCount(1, { timeout: 90_000 })
    await page
      .getByLabel("Class for teaching", { exact: true })
      .selectOption(schoolClass.id)
    await expect(
      page.getByRole("button", { name: "Revoke teaching access", exact: true })
    ).toBeVisible({ timeout: 90_000 })
    await logout(page)
    await signIn(page, "Student")
    await page.goto("/student/classes")
    await expect(
      page.getByRole("heading", { name: className, exact: true })
    ).toBeVisible({
      timeout: 120_000,
    })
    await page.reload()
    await expect(
      page.getByRole("heading", { name: className, exact: true })
    ).toBeVisible({
      timeout: 120_000,
    })
    await page.goto(`/student/classes/${schoolClass.id}`)
    await expect(
      page.getByText("Your active enrollment is verified.", { exact: true })
    ).toBeVisible({ timeout: 120_000 })
    const foreign = "a1000000-0000-4000-8000-000000000002"
    expect(
      (
        await page.request.get(
          `/api/academic-context/classes/${foreign}?role=student`
        )
      ).status()
    ).toBe(404)
    expect(
      (await page.request.get("/api/academic-context?role=teacher")).status()
    ).toBe(403)
    expect(
      (
        await page.request.get(
          "/api/academic-context?role=student&schoolId=foreign"
        )
      ).status()
    ).toBe(400)
    expect(
      (
        await page.request.post(
          `/api/sams/student-administration/classes/${schoolClass.id}/teachers`,
          {
            headers: { origin: new URL(page.url()).origin },
            data: { membershipId },
          }
        )
      ).status()
    ).toBe(401)
    await logout(page)
    await signIn(page, "Teacher")
    await page.goto("/teacher/classes")
    await expect(
      page.getByRole("heading", { name: className, exact: true })
    ).toBeVisible({
      timeout: 120_000,
    })
    await page.reload()
    await expect(
      page.getByRole("heading", { name: className, exact: true })
    ).toBeVisible({
      timeout: 120_000,
    })
    await page.goto(`/teacher/classes/${schoolClass.id}`)
    await expect(
      page.getByText("Your active teaching assignment is verified.", {
        exact: true,
      })
    ).toBeVisible({ timeout: 120_000 })
    await expect(
      page.getByText("Active students: 1", { exact: true })
    ).toBeVisible()
    expect(
      (
        await page.request.get(
          `/api/academic-context/classes/${foreign}?role=teacher`
        )
      ).status()
    ).toBe(404)
    await logout(page)
    await signIn(page, "Admin")
    await page.goto("/admin/classes")
    await page
      .getByLabel("Find class for teaching", { exact: true })
      .fill(className)
    await expect(
      page
        .getByLabel("Class for teaching", { exact: true })
        .locator(`option[value="${schoolClass.id}"]`)
    ).toHaveCount(1, { timeout: 90_000 })
    await page
      .getByLabel("Class for teaching", { exact: true })
      .selectOption(schoolClass.id)
    await save(
      page,
      "Revoke teaching access",
      `student-administration/classes/${schoolClass.id}/teachers/${membershipId}`,
      "PATCH",
      200
    )
    await logout(page)
    await signIn(page, "Teacher")
    await page.goto("/teacher/classes")
    await expect(
      page.getByRole("heading", { name: "Your assigned classes" })
    ).toBeVisible({ timeout: 120_000 })
    await expect
      .poll(
        async () => {
          const response = await page.request.get(
            "/api/academic-context?role=teacher"
          )
          expect(response.status()).toBe(200)
          return (await response.json()).classes.some(
            (item: { id: string }) => item.id === schoolClass.id
          )
        },
        { timeout: 90_000 }
      )
      .toBe(false)
    expect(
      (
        await page.request.get(
          `/api/academic-context/classes/${schoolClass.id}?role=teacher`
        )
      ).status()
    ).toBe(404)
    await logout(page)
    await signIn(page, "Admin")
    await page.goto("/admin/classes")
    await page
      .getByLabel("Find class for teaching", { exact: true })
      .fill(className)
    await expect(
      page
        .getByLabel("Class for teaching", { exact: true })
        .locator(`option[value="${schoolClass.id}"]`)
    ).toHaveCount(1, { timeout: 90_000 })
    await page
      .getByLabel("Class for teaching", { exact: true })
      .selectOption(schoolClass.id)
    await save(
      page,
      "Restore teaching access",
      `student-administration/classes/${schoolClass.id}/teachers/${membershipId}`,
      "PATCH",
      200
    )
    await logout(page)
    await signIn(page, "Teacher")
    await page.goto(`/teacher/classes/${schoolClass.id}`)
    await expect(
      page.getByText("Your active teaching assignment is verified.", {
        exact: true,
      })
    ).toBeVisible({ timeout: 120_000 })
    await logout(page)
    await info.attach("persisted-context-evidence", {
      body: JSON.stringify({
        studentId: student.id,
        classId: schoolClass.id,
        enrollmentId: enrollment.id,
        teacherMembershipId: membershipId,
        accountLinked: true,
        studentReload: true,
        teacherReload: true,
        revokeRestore: true,
      }),
      contentType: "application/json",
    })
  })
})
