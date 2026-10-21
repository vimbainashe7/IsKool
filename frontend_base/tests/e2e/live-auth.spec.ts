import { expect, test, type Page } from "@playwright/test"
import { sign } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { parseEnv } from "node:util"

const live = process.env.ISKOOL_LIVE_AUTH === "true"
const password = process.env.ISKOOL_TEST_PASSWORD
// Playwright's AI error context includes password-input values in ARIA snapshots.
// Preserve screenshots and assertion output without capturing that private DOM.
if (live) process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1"
// Login payloads and rotating cookies must not be retained in trace archives.
test.use({ trace: "off" })
test.afterEach(async ({ page }, testInfo) => {
  if (!live || !password) return
  for (const error of testInfo.errors) {
    if (error.message) error.message = error.message.split(password).join("[REDACTED]")
    if (error.errorContext) error.errorContext = error.errorContext.split(password).join("[REDACTED]")
  }
  // Clear private inputs before teardown can capture another accessibility tree.
  await page.locator('input[type="password"]').evaluateAll((inputs) => {
    for (const input of inputs) (input as HTMLInputElement).value = ""
  }).catch(() => undefined)
})

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
    const access = before.find((cookie) => cookie.name === "iskool-aps-access")
    if (!access) throw new Error("Expected the student's HttpOnly APS access cookie.")
    // Create only an already-expired version of this student's own token.
    // Signing material stays in the Node test process, never in browser JS.
    const backendEnv = {
      ...parseEnv(readFileSync(resolve("../apps/aps-api/.env"), "utf8").replace(/^\uFEFF/, "")),
      ...parseEnv(readFileSync(resolve("../.env"), "utf8").replace(/^\uFEFF/, "")),
    }
    const key = backendEnv.JWT_PRIVATE_KEY_PEM?.replace(/\\n/g, "\n")
    if (!key) throw new Error("The ignored APS development signing key is required for expiry acceptance.")
    const [header, payload] = access.value.split(".")
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString())
    claims.iat = Math.floor(Date.now() / 1000) - 120
    claims.exp = Math.floor(Date.now() / 1000) - 60
    const unsigned = `${header}.${Buffer.from(JSON.stringify(claims)).toString("base64url")}`
    const expired = `${unsigned}.${sign("RSA-SHA256", Buffer.from(unsigned), key).toString("base64url")}`
    await context.addCookies([{ ...access, value: expired }])

    const workspace = await page.request.get("/api/workspace")
    expect(workspace.status()).toBe(200)
    expect((await workspace.json()).mode).toBe("live")
    const after = await context.cookies()
    expect(after.find((cookie) => cookie.name === "iskool-aps-access")?.value).toBeTruthy()
    expect(after.find((cookie) => cookie.name === "iskool-refresh")?.value !== oldRefresh).toBe(true)

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
    await page.getByLabel("Password", { exact: true }).fill("incorrect-fixture-password")
    await page.getByRole("button", { name: "Sign in", exact: true }).click()
    await expect(page.getByRole("alert").filter({ hasText: "Invalid email or password" })).toBeVisible()

    await signIn(page, "student.alpha@example.test", password)
    await expect(page).toHaveURL(/\/student\/dashboard$/, { timeout: 120_000 })
    await page.goto("/admin/dashboard")
    await expect(page).toHaveURL(/\/student\/dashboard$/)
    await page.goto("/teacher/dashboard")
    await expect(page).toHaveURL(/\/student\/dashboard$/)

    const betaLogin = await page.request.post("http://127.0.0.1:3002/api/v1/auth/login", {
      data: { email: "registrar.beta@example.test", password },
    })
    expect(betaLogin.status()).toBe(201)
    const beta = await betaLogin.json()
    expect(beta.school.name).toBe("School Beta")
    try {
      const foreignSchool = await page.request.post("http://127.0.0.1:3002/api/v1/auth/login", {
        data: { email: "student.alpha@example.test", password, schoolId: beta.school.id },
      })
      expect(foreignSchool.status()).toBe(422)
      expect((await foreignSchool.json()).error.code).toBe("SCHOOL_CONTEXT_DENIED")
    } finally {
      await page.request.post("http://127.0.0.1:3002/api/v1/auth/logout", {
        headers: { authorization: `Bearer ${beta.accessTokens.sams}` },
      })
    }
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
    await page.getByLabel("Password", { exact: true }).fill(password)
  } catch {
    throw new Error("Could not enter the private development fixture password.")
  }
  expect((await page.getByLabel("Password", { exact: true }).inputValue()) === password).toBe(true)
  const [response] = await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/auth/login") && response.request().method() === "POST", { timeout: 45_000 }),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ])
  expect(response.status(), "Live backend login must succeed before dashboard routing").toBe(200)
}
