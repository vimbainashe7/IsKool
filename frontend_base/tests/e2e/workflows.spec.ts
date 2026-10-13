import { test, expect, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
async function preview(page: Page, role: string) {
  await page.goto(`/api/dev/demo-login?role=${role}`)
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    `${role[0].toUpperCase() + role.slice(1)} dashboard`
  )
  await expect(page.getByText(/Development preview|Dev data/)).toBeVisible()
}
async function confirm(page: Page, label: string) {
  await page.getByRole("button", { name: label, exact: true }).click()
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click()
  await expect(page.getByRole("dialog")).not.toBeVisible()
}
test("unauthenticated protection, callback failure, recovery form and expired session", async ({
  page,
}) => {
  await page.goto("/admin/dashboard")
  await expect(page).toHaveURL(/sign-in/)
  await page.getByRole("link", { name: "Forgot your password?" }).click()
  await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible()
  await page.goto(
    "/auth/confirm?token_hash=bad&type=recovery&next=//evil.example"
  )
  await expect(page).toHaveURL(/sign-in\?notice=invalid-link/)
  await preview(page, "student")
  await page.context().clearCookies()
  await page.goto("/student/dashboard")
  await expect(page).toHaveURL(/sign-in/)
  expect((await page.request.get("/api/workspace")).status()).toBe(401)
})
test("student role guards, assignment upload and server-confirmed submission persistence", async ({
  page,
}) => {
  await preview(page, "student")
  await page.goto("/teacher/dashboard")
  await expect(page).toHaveURL(/student\/dashboard/)
  await page.goto("/admin/dashboard")
  await expect(page).toHaveURL(/student\/dashboard/)
  const blocked = await page.request.post("/api/workspace", {
    headers: { origin: "http://localhost:3100" },
    data: {
      action: "member.update",
      memberId: "student-1",
      roles: ["admin"],
      status: "active",
    },
  })
  expect(blocked.status()).toBe(403)
  await page.goto("/student/assignments")
  await page
    .getByRole("link", { name: "Algebra: simultaneous equations" })
    .click()
  await page.getByLabel("Choose a file or drop it here").setInputFiles({
    name: "answers.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Student algebra working"),
  })
  await page.getByRole("button", { name: "Upload file", exact: true }).click()
  await expect(
    page.getByText("File uploaded. Review it before confirming.")
  ).toBeVisible()
  await confirm(page, "Submit assignment")
  await expect(
    page.getByText(/Submitted. The server confirmed your work/)
  ).toBeVisible()
  await page.reload()
  await expect(page.getByText("answers.txt", { exact: true })).toBeVisible()
  await expect(page.getByText(/Status:/)).toContainText("Submitted")
  await page.goto("/student/grades")
  await expect(
    page.getByText(/released marks and feedback will appear here/)
  ).toBeVisible()
  await page.goto("/student/notes")
  await expect(
    page.getByRole("link", { name: "Algebra worked examples" })
  ).toBeVisible()
})
test("teacher assignment creation, material upload, review and gradebook persistence", async ({
  page,
}) => {
  await preview(page, "teacher")
  await page.goto("/teacher/classes")
  await page.getByRole("link", { name: "Mathematics 4A" }).click()
  await page.getByRole("link", { name: "Create assignment" }).click()
  await page
    .getByLabel("Title", { exact: true })
    .fill("Tested classroom assignment")
  await page
    .getByLabel("Instructions", { exact: true })
    .fill("Solve the following equations and show all working.")
  await page
    .getByLabel("Due date and time (Africa/Harare)")
    .fill("2030-10-05T09:00")
  await page.getByRole("button", { name: "Next", exact: true }).click()
  await page.getByRole("button", { name: "Next", exact: true }).click()
  await page.getByRole("button", { name: "Save draft", exact: true }).click()
  await expect(page.getByText("Assignment draft saved.")).toBeVisible()
  await page.goto("/teacher/assignments")
  await expect(
    page.getByRole("link", { name: "Tested classroom assignment" })
  ).toBeVisible()
  await page.goto("/teacher/materials")
  await page.getByLabel("Topic", { exact: true }).fill("Algebra review")
  await page.getByLabel("Title", { exact: true }).fill("Worked lesson notes")
  await page.getByLabel("Choose a file or drop it here").setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Teacher lesson notes"),
  })
  await page.getByRole("button", { name: "Upload file", exact: true }).click()
  await expect(
    page.getByText("File uploaded. Review it before confirming.")
  ).toBeVisible()
  await page.getByRole("button", { name: "Save draft", exact: true }).click()
  await expect(page.getByText("Material draft saved.")).toBeVisible()
  await page.goto("/teacher/submissions")
  await page.getByLabel(/Mark \(maximum/).fill("40")
  await page
    .getByLabel("Feedback", { exact: true })
    .fill("Good reasoning. Show the elimination step next time.")
  await page
    .getByRole("button", { name: "Save review draft", exact: true })
    .click()
  await expect(page.getByText("Review draft saved.")).toBeVisible()
  await confirm(page, "Publish grade and feedback")
  await page.getByRole("button", { name: "Next student" }).click()
  await expect(page.getByText(/2 of/)).toBeVisible()
  await page.goto("/teacher/gradebook")
  await page
    .getByRole("button", { name: "Mark for Learner 003: missing" })
    .click()
  await page.getByRole("textbox", { name: "Mark for Learner 003" }).fill("35")
  await page.keyboard.press("Tab")
  await expect(
    page.getByRole("button", { name: "Mark for Learner 004: missing" })
  ).toBeFocused()
  await page.getByRole("button", { name: "Save marks", exact: true }).click()
  await expect(page.getByText(/Marks saved/)).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole("button", { name: "Mark for Learner 003: 35" })
  ).toBeVisible()
})
for (const tool of [
  { id: "compile-notes", name: "Compile Notes" },
  { id: "create-test", name: "Test Generator" },
  { id: "create-assignment", name: "Assignment Generator" },
])
  test(`AI ${tool.name}: durable job, review and approval`, async ({
    page,
  }) => {
    await preview(page, "teacher")
    await page.goto(`/teacher/ai?tool=${tool.id}`)
    await page
      .getByLabel("Topic", { exact: true })
      .fill("Simultaneous equations")
    await page
      .getByLabel("Learning objective and instructions")
      .fill("Explain the elimination method with worked examples.")
    await page
      .getByRole("button", { name: "Generate draft", exact: true })
      .click()
    await expect(page.getByText(/Job queued/)).toBeVisible()
    await page.goto("/teacher/dashboard")
    await page.goto("/teacher/ai")
    await expect(page.getByText("Job: completed")).toBeVisible()
    await page
      .getByRole("button", { name: "Review draft", exact: true })
      .click()
    await page
      .getByLabel("Draft content")
      .fill("Teacher reviewed revision notes with verified examples.")
    await confirm(page, "Approve review")
    await expect(page.getByText(/Content lifecycle:/)).toContainText("reviewed")
    await confirm(page, "Publish reviewed content")
    await expect(page.getByText(/Content lifecycle:/)).toContainText(
      "published"
    )
    await page.reload()
    await expect(
      page.getByRole("heading", { name: "Published outputs" })
    ).toBeVisible()
  })
test("admin search, user detail, confirmed role change, context switch and logout", async ({
  page,
}) => {
  await preview(page, "admin")
  await page.goto("/admin/users")
  await page.getByLabel("Search users").fill("Learner 001")
  await page.getByRole("link", { name: "Learner 001" }).click()
  await page.getByRole("checkbox", { name: "teacher", exact: true }).check()
  await confirm(page, "Save roles and access")
  await expect(page.getByText("Access change confirmed.")).toBeVisible()
  await page.reload()
  await expect(page.getByText(/Roles: student, teacher/)).toBeVisible()
  await page.getByRole("button", { name: "Switch work context" }).click()
  await page.getByRole("menuitem", { name: "teacher", exact: true }).click()
  await expect(page).toHaveURL(/teacher\/dashboard/)
  await expect(page.getByRole("button", { name: "Search IsKool" })).toBeEnabled()
  await page.getByRole("button", { name: "Profile menu" }).click()
  await page.getByRole("button", { name: "Sign out", exact: true }).click()
  await expect(page).toHaveURL(/sign-in/)
  await page.goto("/teacher/dashboard")
  await expect(page).toHaveURL(/sign-in/)
})
test("keyboard command search and mobile drawer restore focus", async ({
  page,
}) => {
  await preview(page, "teacher")
  await expect(
    page.getByRole("button", { name: "Search IsKool Ctrl K" })
  ).toBeEnabled()
  await page.keyboard.press("Control+k")
  await expect(page.getByRole("dialog")).toBeVisible()
  await page
    .getByPlaceholder("Search permitted pages and actions…")
    .fill("Gradebook")
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/teacher\/gradebook/)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole("button", { name: "Toggle Sidebar" }).click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog")).not.toBeVisible()
  await expect(
    page.getByRole("button", { name: "Toggle Sidebar" })
  ).toBeFocused()
})
test("responsive critical screens and automated accessibility", async ({
  page,
}) => {
  test.setTimeout(300000)
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  for (const width of [360, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await preview(page, "teacher")
    for (const route of [
      "/teacher/dashboard",
      "/teacher/materials",
      "/teacher/submissions",
      "/teacher/gradebook",
      "/teacher/ai",
    ]) {
      await page.goto(route)
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
      if (route === "/teacher/dashboard")
        await page.screenshot({
          path: `docs/frontend/evidence/teacher-${width}.png`,
          fullPage: true,
        })
      if (width === 1440) {
        const audit = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
        expect(audit.violations, route).toEqual([])
      }
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      )
      expect(overflow, `${route} at ${width}px overflows`).toBe(false)
    }
    await preview(page, "student")
    for (const route of [
      "/student/dashboard",
      "/student/assignments/assignment-1",
    ]) {
      await page.goto(route)
      if (route === "/student/dashboard")
        await page.screenshot({
          path: `docs/frontend/evidence/student-${width}.png`,
          fullPage: true,
        })
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1
        ),
        `${route} at ${width}px`
      ).toBe(false)
    }
    await preview(page, "admin")
    for (const route of ["/admin/dashboard", "/admin/users"]) {
      await page.goto(route)
      if (route === "/admin/dashboard")
        await page.screenshot({
          path: `docs/frontend/evidence/admin-${width}.png`,
          fullPage: true,
        })
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1
        ),
        `${route} at ${width}px`
      ).toBe(false)
    }
  }
  await page.screenshot({ path: "test-results/admin-1440.png", fullPage: true })
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze()
  expect(results.violations).toEqual([])
  expect(errors).toEqual([])
})
