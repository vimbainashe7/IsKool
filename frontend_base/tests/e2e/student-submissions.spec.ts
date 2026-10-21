import { expect, test, type Page } from "@playwright/test"
const live = process.env.ISKOOL_LIVE_AUTH === "true",
  password = process.env.ISKOOL_TEST_PASSWORD
test.use({ trace: "off", actionTimeout: 90000, navigationTimeout: 120000 })
test.afterEach(async ({ page }, info) => {
  if (!live || !password) return
  for (const e of info.errors) {
    if (e.message) e.message = e.message.split(password).join("[REDACTED]")
    if (e.errorContext)
      e.errorContext = e.errorContext.split(password).join("[REDACTED]")
  }
  await page
    .locator('input[type="password"]')
    .evaluateAll((inputs) =>
      inputs.forEach((i) => {
        ;(i as HTMLInputElement).value = ""
      })
    )
    .catch(() => {})
})
async function signIn(page: Page, role: "Student" | "Teacher" | "Admin") {
  if (!password) throw Error("Private development credential required.")
  await page.goto("/sign-in")
  await page.getByRole("button", { name: role, exact: true }).click()
  try {
    await page.getByLabel("Password", { exact: true }).fill(password)
  } catch {
    throw Error("Private credential entry failed.")
  }
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(page).toHaveURL(
    new RegExp(`/${role.toLowerCase()}/dashboard$`),
    { timeout: 120000 }
  )
}
async function signOut(page: Page) {
  await page.getByRole("button", { name: "Profile menu" }).click()
  await page.getByRole("button", { name: "Sign out", exact: true }).click()
  await expect(page).toHaveURL(/\/sign-in$/)
}
test.describe("live Student assignment submission", () => {
  test.skip(!live, "Requires approved connected development services.")
  test("published feed, answer, dedup, resubmission and dashboard status persist", async ({
    page,
  }, info) => {
    test.setTimeout(1200000)
    await signIn(page, "Teacher")
    const origin = new URL(page.url()).origin
    const r = await page.request.get(
      "/api/academic-context?role=teacher&limit=50"
    )
    expect(r.status()).toBe(200)
    const context = await r.json(),
      today = new Date(Date.now() + 7200000).toISOString().slice(0, 10)
    const schoolClass = context.classes.find(
      (c: { terms: Array<{ startsOn: string; endsOn: string }> }) =>
        c.terms.some((t) => t.startsOn <= today && t.endsOn >= today)
    )
    if (!schoolClass)
      throw Error("Teacher needs an assigned current class and term.")
    const term = schoolClass.terms.find(
      (t: { startsOn: string; endsOn: string }) =>
        t.startsOn <= today && t.endsOn >= today
    )
    const title = `Pilot Student Work ${Date.now()}`
    const creation = await page.request.post("/api/assignments", {
      headers: { origin },
      data: {
        classId: schoolClass.id,
        academicTermId: term.id,
        title,
        instructions: "Explain your reasoning in a short text answer.",
        totalMarks: 10,
        dueAt: new Date(Date.now() + 900000).toISOString(),
      },
    })
    expect(creation.status()).toBe(201)
    const task = await creation.json()
    await signOut(page)
    await signIn(page, "Student")
    expect(
      (await page.request.get(`/api/student-work/${task.id}`)).status()
    ).toBe(404)
    const studentContext = await (
      await page.request.get("/api/academic-context?role=student&limit=50")
    ).json()
    if (!studentContext.student)
      throw Error(
        "Link Student Alpha to a student record before live acceptance."
      )
    if (
      !studentContext.classes.some(
        (c: { id: string }) => c.id === schoolClass.id
      )
    ) {
      await signOut(page)
      await signIn(page, "Admin")
      await page.goto(`/admin/students/${studentContext.student.id}`)
      await page
        .getByLabel("Class", { exact: true })
        .selectOption(schoolClass.id)
      await page
        .getByLabel("Academic term", { exact: true })
        .selectOption(term.id)
      await page
        .getByLabel("Enrollment status", { exact: true })
        .selectOption("active")
      const enrolled = page.waitForResponse(
        (r) =>
          r.request().method() === "POST" && r.url().includes("/enrollments")
      )
      await page
        .getByRole("button", { name: "Enroll student", exact: true })
        .click()
      expect((await enrolled).status()).toBe(201)
    }
    await signOut(page)
    await signIn(page, "Teacher")
    expect(
      (
        await page.request.post(`/api/assignments/${task.id}/publish`, {
          headers: { origin },
          data: { version: 1 },
        })
      ).status()
    ).toBe(201)
    expect((await page.request.get("/api/student-work")).status()).toBe(403)
    await signOut(page)
    await signIn(page, "Student")
    await page.goto("/student/assignments")
    await expect(
      page.getByRole("link", { name: new RegExp(title) })
    ).toBeVisible({ timeout: 90000 })
    await page.getByRole("link", { name: new RegExp(title) }).click()
    await page
      .getByLabel("Answer", { exact: true })
      .fill("My first reasoned answer.")
    const first = page.waitForResponse(
      (r) =>
        r.url().endsWith(`/student-work/${task.id}/submissions`) &&
        r.request().method() === "POST"
    )
    await page
      .getByRole("button", { name: "Submit answer", exact: true })
      .click()
    const firstResponse = await first
    expect(firstResponse.status()).toBe(201)
    const submitted = await firstResponse.json()
    await expect(
      page.getByText("Answer submitted.", { exact: true })
    ).toBeVisible()
    const duplicate = await page.request.post(
      `/api/student-work/${task.id}/submissions`,
      {
        headers: { origin },
        data: { text: "My first reasoned answer.", expectedAttempt: 0 },
      }
    )
    expect(duplicate.status()).toBe(201)
    expect((await duplicate.json()).submission.id).toBe(submitted.submission.id)
    await page.reload()
    await expect(page.getByLabel("Answer", { exact: true })).toHaveValue(
      "My first reasoned answer.",
      { timeout: 90000 }
    )
    await page
      .getByLabel("Answer", { exact: true })
      .fill("My revised reasoned answer.")
    const second = page.waitForResponse(
      (r) =>
        r.url().endsWith(`/student-work/${task.id}/submissions`) &&
        r.request().method() === "POST"
    )
    await page
      .getByRole("button", { name: "Resubmit answer", exact: true })
      .click()
    expect((await second).status()).toBe(201)
    await expect(page.getByRole("heading", { name: /Attempt 2/ })).toBeVisible()
    await page.reload()
    await expect(page.getByLabel("Answer", { exact: true })).toHaveValue(
      "My revised reasoned answer.",
      { timeout: 90000 }
    )
    await expect(page.getByRole("heading", { name: /Attempt 1/ })).toBeVisible()
    await expect(page.getByRole("heading", { name: /Attempt 2/ })).toBeVisible()
    expect(
      (
        await page.request.post(`/api/student-work/${task.id}/submissions`, {
          headers: { origin },
          data: { text: "Stale change", expectedAttempt: 0 },
        })
      ).status()
    ).toBe(409)
    expect(
      (
        await page.request.get(
          "/api/student-work/00000000-0000-4000-8000-000000000099"
        )
      ).status()
    ).toBe(404)
    await page.screenshot({
      path: info.outputPath("student-submission-desktop.png"),
      fullPage: true,
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1
        )
      )
      .toBe(true)
    await page.screenshot({
      path: info.outputPath("student-submission-mobile.png"),
      fullPage: true,
    })
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto("/student/dashboard")
    const feed = await (
      await page.request.get("/api/student-work?limit=50")
    ).json()
    const saved = feed.items.find((a: { id: string }) => a.id === task.id)
    expect(saved.latestSubmission.attempt).toBe(2)
    await expect(
      page.getByRole("heading", { name: "My Assignments", exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: new RegExp(title) })
    ).toContainText("Attempt 2 of 3")
    await page.reload()
    await expect(
      page.getByRole("heading", { name: "My Assignments", exact: true })
    ).toBeVisible()
    await info.attach("persisted-student-work", {
      body: JSON.stringify({
        assignmentId: task.id,
        studentId: studentContext.student.id,
        expectedAttempts: 2,
      }),
      contentType: "application/json",
    })
    await signOut(page)
  })
})
