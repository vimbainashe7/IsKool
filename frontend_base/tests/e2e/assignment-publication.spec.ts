import { expect, test, type Page } from "@playwright/test"
const live = process.env.ISKOOL_LIVE_AUTH === "true",
  password = process.env.ISKOOL_TEST_PASSWORD
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
    .evaluateAll((inputs) =>
      inputs.forEach((i) => {
        ;(i as HTMLInputElement).value = ""
      })
    )
    .catch(() => {})
})
async function signIn(page: Page, role: "Teacher" | "Student") {
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
test.describe("live Teacher assignment publication", () => {
  test.skip(
    !live,
    "Requires approved development services and an assigned teaching class/term."
  )
  test("draft edits, publication, dashboard counts, archive and denials persist", async ({
    page,
  }, info) => {
    test.setTimeout(900000)
    await signIn(page, "Teacher")
    const origin = new URL(page.url()).origin
    const beforeResponse = await page.request.get("/api/assignments?limit=3")
    expect(beforeResponse.status()).toBe(200)
    const before = await beforeResponse.json()
    const contextResponse = await page.request.get(
      "/api/academic-context?role=teacher&limit=50"
    )
    expect(contextResponse.status()).toBe(200)
    const context = await contextResponse.json(),
      tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const schoolClass = context.classes.find(
      (c: { terms: Array<{ startsOn: string; endsOn: string }> }) =>
        c.terms.some((t) => t.startsOn <= tomorrow && t.endsOn >= tomorrow)
    )
    if (!schoolClass)
      throw Error(
        "Assign a Teacher class with a term containing tomorrow before live acceptance."
      )
    const term = schoolClass.terms.find(
      (t: { startsOn: string; endsOn: string }) =>
        t.startsOn <= tomorrow && t.endsOn >= tomorrow
    )
    const title = `Pilot Assignment ${Date.now()}`
    await page.goto("/teacher/assignments/new")
    await expect(page.getByLabel("Class", { exact: true })).toBeEnabled({
      timeout: 90000,
    })
    await page.getByLabel("Class", { exact: true }).selectOption(schoolClass.id)
    await page
      .getByLabel("Academic term", { exact: true })
      .selectOption(term.id)
    await page.getByLabel("Title", { exact: true }).fill(title)
    await page
      .getByLabel("Instructions", { exact: true })
      .fill("Show your working for every question.")
    await page.getByLabel("Total marks", { exact: true }).fill("20.5")
    await page
      .getByLabel("Deadline (Africa/Harare)", { exact: true })
      .fill(`${tomorrow}T12:00`)
    const creation = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/api/assignments" &&
        r.request().method() === "POST"
    )
    await page.getByRole("button", { name: "Save draft", exact: true }).click()
    const createdResponse = await creation
    expect(createdResponse.status()).toBe(201)
    const created = await createdResponse.json()
    await expect(page).toHaveURL(
      new RegExp(`/teacher/assignments/${created.id}$`)
    )
    await page.reload()
    await expect(page.getByLabel("Title", { exact: true })).toHaveValue(title, {
      timeout: 90000,
    })
    await page
      .getByLabel("Instructions", { exact: true })
      .fill("Updated: show all calculations.")
    const update = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === `/api/assignments/${created.id}` &&
        r.request().method() === "PATCH"
    )
    await page.getByRole("button", { name: "Save draft", exact: true }).click()
    expect((await update).status()).toBe(200)
    const stale = await page.request.patch(`/api/assignments/${created.id}`, {
      headers: { origin },
      data: {
        title,
        instructions: "Stale edit",
        totalMarks: 20.5,
        dueAt: created.dueAt,
        version: 1,
      },
    })
    expect(stale.status()).toBe(409)
    await page.reload()
    await expect(page.getByLabel("Instructions", { exact: true })).toHaveValue(
      "Updated: show all calculations.",
      { timeout: 90000 }
    )
    await page
      .getByRole("button", { name: "Publish assignment", exact: true })
      .click()
    const publication = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === `/api/assignments/${created.id}/publish`
    )
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Confirm", exact: true })
      .click()
    expect((await publication).status()).toBe(201)
    await page.reload()
    await expect(page.getByLabel("Title", { exact: true })).toBeDisabled({
      timeout: 90000,
    })
    const persisted = await page.request.get(`/api/assignments/${created.id}`)
    expect(persisted.status()).toBe(200)
    const published = await persisted.json()
    expect(published.status).toBe("published")
    expect(published.publishedAt).toBeTruthy()
    expect(published.version).toBe(3)
    await page.goto("/teacher/dashboard")
    await expect(page.getByLabel("published assignments")).toContainText(
      String(before.summary.published + 1),
      { timeout: 90000 }
    )
    const invalid = await page.request.post("/api/assignments", {
      headers: { origin },
      data: {
        classId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        academicTermId: term.id,
        title,
        instructions: "Wrong class",
        totalMarks: 20,
        dueAt: created.dueAt,
      },
    })
    expect(invalid.status()).toBe(404)
    await page.goto(`/teacher/assignments/${created.id}`)
    await page
      .getByRole("button", { name: "Archive assignment", exact: true })
      .click()
    const archival = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === `/api/assignments/${created.id}/archive`
    )
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Confirm", exact: true })
      .click()
    expect((await archival).status()).toBe(201)
    await page.reload()
    await expect(page.getByText(/Saved archived/)).toBeVisible({
      timeout: 90000,
    })
    await page.screenshot({
      path: info.outputPath("teacher-assignment-archived.png"),
      fullPage: true,
    })
    await page.getByRole("button", { name: "Profile menu" }).click()
    await page.getByRole("button", { name: "Sign out", exact: true }).click()
    await expect(page).toHaveURL(/\/sign-in$/)
    await signIn(page, "Student")
    expect(
      (await page.request.get(`/api/assignments/${created.id}`)).status()
    ).toBe(403)
    expect(
      (
        await page.request.post("/api/assignments", {
          headers: { origin },
          data: {
            classId: schoolClass.id,
            academicTermId: term.id,
            title,
            instructions: "Denied",
            totalMarks: 20,
            dueAt: created.dueAt,
          },
        })
      ).status()
    ).toBe(403)
    await page.getByRole("button", { name: "Profile menu" }).click()
    await page.getByRole("button", { name: "Sign out", exact: true }).click()
    await info.attach("saved-assignment", {
      body: JSON.stringify({
        assignmentId: created.id,
        title,
        expectedVersion: 4,
        expectedStatus: "archived",
      }),
      contentType: "application/json",
    })
  })
})
