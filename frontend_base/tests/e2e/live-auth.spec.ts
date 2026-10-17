import { expect, test, type Page } from "@playwright/test"

const live = process.env.ISKOOL_LIVE_AUTH === "true"
const password = process.env.ISKOOL_TEST_PASSWORD
// Playwright's AI error context includes password-input values in ARIA snapshots.
// Preserve screenshots and assertion output without capturing that private DOM.
if (live) process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1"
// Login payloads and rotating cookies must not be retained in trace archives.
test.use({ trace: "off" })

test.describe("live IsKool authentication", () => {
  test.skip(!live, "Set ISKOOL_LIVE_AUTH=true to run against the local APIs and live development database.")

  for (const account of [
    { role: "student", email: "student.alpha@example.test", name: "Student Alpha" },
    { role: "teacher", email: "teacher.alpha@example.test", name: "Teacher Alpha" },
    { role: "admin", email: "admin.alpha@example.test", name: "Admin Alpha" },
  ] as const) {
    test(`${account.role} can sign in, reload, and sign out`, async ({ page, context }, testInfo) => {
      test.setTimeout(240_000)
      if (!password) throw new Error("ISKOOL_TEST_PASSWORD is required for live auth tests.")
      await signIn(page, account.email, password)
      await expect(page).toHaveURL(new RegExp(`/${account.role}/dashboard$`), {
        timeout: 120_000,
      })
      await expect(page.getByRole("button", { name: "Profile menu" })).toBeVisible()
      await expect(page.getByText("School Alpha", { exact: true }).first()).toBeVisible()
      const workspace = await page.request.get("/api/workspace")
      expect(workspace.status()).toBe(200)
      expect((await workspace.json()).mode).toBe("live")
      const cookies = await context.cookies()
      expect(cookies.filter((cookie) => cookie.name.startsWith("iskool-") && cookie.name !== "iskool-active-role").every((cookie) => cookie.httpOnly)).toBe(true)
      await page.screenshot({ path: testInfo.outputPath(`${account.role}-dashboard.png`), fullPage: true })

      await page.reload()
      await expect(page).toHaveURL(new RegExp(`/${account.role}/dashboard$`), {
        timeout: 120_000,
      })
      await page.getByRole("button", { name: "Profile menu" }).click()
      await expect(
        page.getByRole("menu", { name: "Profile menu" }).getByText(account.name, {
          exact: true,
        })
      ).toBeVisible()
      await page.getByRole("button", { name: "Sign out", exact: true }).click()
      await expect(page).toHaveURL(/\/sign-in$/)

      await page.goto(`/${account.role}/dashboard`)
      await expect(page).toHaveURL(/\/sign-in\?next=/)
    })
  }

  test("an expired access session is restored from the rotating refresh cookie", async ({
    page,
    context,
  }) => {
    test.setTimeout(240_000)
    if (!password) throw new Error("ISKOOL_TEST_PASSWORD is required for live auth tests.")
    await signIn(page, "student.alpha@example.test", password)
    await expect(page).toHaveURL(/\/student\/dashboard$/, { timeout: 120_000 })

    const before = await context.cookies()
    const oldRefresh = before.find((cookie) => cookie.name === "iskool-refresh")?.value
    expect(oldRefresh).toBeTruthy()
    await context.clearCookies({ name: "iskool-aps-access" })

    const workspace = await page.request.get("/api/workspace")
    expect(workspace.status()).toBe(200)
    expect((await workspace.json()).mode).toBe("live")
    const after = await context.cookies()
    expect(after.find((cookie) => cookie.name === "iskool-aps-access")?.value).toBeTruthy()
    expect(after.find((cookie) => cookie.name === "iskool-refresh")?.value).not.toBe(oldRefresh)

    await page.goto("/student/dashboard")
    await expect(page).toHaveURL(/\/student\/dashboard$/, { timeout: 120_000 })
  })

  test("quick-fill cannot grant admin, reject bad passwords and foreign schools", async ({ page }) => {
    test.setTimeout(180_000)
    if (!password) throw new Error("ISKOOL_TEST_PASSWORD is required for live auth tests.")
    await page.goto("/sign-in")
    await page.getByRole("button", { name: "Admin", exact: true }).click()
    await expect(page).toHaveURL(/\/sign-in$/)
    const before = await page.request.get("/api/workspace")
    expect(before.status()).toBe(401)
    await page.getByLabel("Development seed password").fill("incorrect-fixture-password")
    await page.getByRole("button", { name: "Sign in", exact: true }).click()
    await expect(page.getByRole("alert")).toContainText("Invalid email or password")

    await signIn(page, "student.alpha@example.test", password)
    await expect(page).toHaveURL(/\/student\/dashboard$/, { timeout: 120_000 })
    await page.goto("/admin/dashboard")
    await expect(page).toHaveURL(/\/student\/dashboard$/)
    await page.goto("/teacher/dashboard")
    await expect(page).toHaveURL(/\/student\/dashboard$/)

    const foreignSchool = await page.request.post("http://127.0.0.1:3002/api/v1/auth/login", {
      data: { email: "student.alpha@example.test", password, schoolId: "00000000-0000-4000-8000-000000000099" },
    })
    expect(foreignSchool.status()).toBe(422)
    expect((await foreignSchool.json()).error.code).toBe("SCHOOL_CONTEXT_DENIED")
  })

  test("demo login cannot create a live session or choose admin", async ({ page, context }) => {
    await page.goto("/api/dev/demo-login?role=admin")
    await expect(page).toHaveURL(/\/sign-in$/)
    expect((await context.cookies()).some((cookie) => cookie.name === "iskool-demo-role")).toBe(false)
    const workspace = await page.request.get("/api/workspace")
    expect(workspace.status()).toBe(401)
  })
})

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in")
  const role = email.split(".")[0]
  await page.getByRole("button", { name: role[0].toUpperCase() + role.slice(1), exact: true }).click()
  await expect(page.getByRole("textbox", { name: "Email" })).toHaveValue(email)
  try {
    await page.getByLabel("Development seed password").fill(password)
  } catch {
    throw new Error("Could not enter the private development fixture password.")
  }
  expect((await page.getByLabel("Password", { exact: true }).inputValue()) === password).toBe(true)
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
}
