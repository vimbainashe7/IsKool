import { expect, test, type Page } from "@playwright/test"
const live = process.env.ISKOOL_LIVE_AUTH === "true"
const password = process.env.ISKOOL_TEST_PASSWORD
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWMQMgnDihiGlgQALKknAfJed/0AAAAASUVORK5CYII=",
  "base64"
)
const replacementPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWOYybAKK2IYWhIAiVlQwX/EPOEAAAAASUVORK5CYII=",
  "base64"
)
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
async function login(
  page: Page,
  role: "admin" | "teacher" | "student" | "other"
) {
  if (!password)
    throw new Error("Private development fixture credential required.")
  await page.goto("/sign-in")
  await page
    .getByLabel("Email", { exact: true })
    .fill(`branding.${role}@example.test`)
  try {
    await page.getByLabel("Password", { exact: true }).fill(password)
  } catch {
    throw new Error("Could not enter private credential.")
  }
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(page).toHaveURL(
    new RegExp(`/${role === "other" ? "teacher" : role}/dashboard$`),
    {
      timeout: 120_000,
    }
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
  method = "PATCH",
  status = 200
) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === `/api/school-settings${path}` &&
        r.request().method() === method,
      { timeout: 90_000 }
    ),
    page.getByRole("button", { name: button, exact: true }).click(),
  ])
  expect(response.status()).toBe(status)
  return response.json()
}
test.describe("live white-label settings", () => {
  test.skip(
    !live,
    "Requires approved isolated branding fixture school and real APIs/PostgreSQL."
  )
  test("Admin edits identity, uploads/replaces/removes logo; all roles see persisted school branding", async ({
    page,
  }, info) => {
    test.setTimeout(600_000)
    await login(page, "admin")
    await page.goto("/settings/account")
    await expect(
      page.getByLabel("Your display name", { exact: true })
    ).toBeVisible({ timeout: 120_000 })
    const initialResponse = await page.request.get("/api/school-settings")
    expect(initialResponse.status()).toBe(200)
    const initial = await initialResponse.json()
    // These fixtures are dedicated to branding acceptance. Never rename Alpha,
    // Beta, the owner's Admin, or an arbitrary school from a request parameter.
    expect(initial.school.id).toBe("b1000000-0000-4000-8000-000000000001")
    const name = `Branding Academy ${Date.now()}`
    const displayName = "Branding Owner"
    await page
      .getByLabel("Your display name", { exact: true })
      .fill(displayName)
    await save(page, "Save my name", "/profile")
    await page.getByLabel("School name", { exact: true }).fill(name)
    const renamed = await save(page, "Save school name", "")
    await expect(
      page.locator("header").getByText(name, { exact: true })
    ).toBeVisible({ timeout: 120_000 })
    const stale = await page.request.patch("/api/school-settings", {
      headers: { origin: new URL(page.url()).origin },
      data: { name: "Stale name", version: initial.school.brandingVersion },
    })
    expect(stale.status()).toBe(409)
    const elevated = await page.request.patch("/api/school-settings/profile", {
      headers: { origin: new URL(page.url()).origin },
      data: {
        displayName: "Wrong user",
        version: 1,
        userId: "foreign",
        roles: ["admin"],
      },
    })
    expect(elevated.status()).toBe(400)
    const badLogo = await page.request.post("/api/school-settings/logo", {
      headers: { origin: new URL(page.url()).origin },
      multipart: {
        version: String(renamed.school.brandingVersion),
        logo: {
          name: "hidden.png",
          mimeType: "image/png",
          buffer: Buffer.from("<svg/>"),
        },
      },
    })
    expect(badLogo.status()).toBe(422)
    await page.getByLabel("School logo", { exact: true }).setInputFiles({
      name: "acceptance.png",
      mimeType: "image/png",
      buffer: png,
    })
    const logoButton = (await page
      .getByRole("button", { name: "Save school logo", exact: true })
      .count())
      ? "Save school logo"
      : "Replace school logo"
    const saved = await save(page, logoButton, "/logo", "POST", 201)
    expect(saved.school.logoPresent).toBe(true)
    const firstLogo = await page.request.get("/api/school-logo")
    expect(firstLogo.status()).toBe(200)
    expect(firstLogo.headers()["content-type"]).toContain("image/webp")
    expect(firstLogo.headers()["cache-control"]).toBe("private, no-store")
    let canonical = await firstLogo.body()
    await page.getByLabel("School logo", { exact: true }).setInputFiles({
      name: "replacement.png",
      mimeType: "image/png",
      buffer: replacementPng,
    })
    const replacement = await save(
      page,
      "Replace school logo",
      "/logo",
      "POST",
      201
    )
    expect(replacement.school.brandingVersion).toBe(
      saved.school.brandingVersion + 1
    )
    const replacedImage = await page.request.get("/api/school-logo")
    expect(replacedImage.status()).toBe(200)
    const replacedBytes = await replacedImage.body()
    expect(replacedBytes).not.toEqual(canonical)
    canonical = replacedBytes
    await page.reload()
    await expect(page.getByLabel("School name", { exact: true })).toHaveValue(
      name,
      { timeout: 120_000 }
    )
    await expect(
      page.getByLabel("Your display name", { exact: true })
    ).toHaveValue(displayName)
    await page.goto("/admin/dashboard")
    await expect(
      page.locator("header").getByText(name, { exact: true })
    ).toBeVisible({ timeout: 120_000 })
    await expect(page.locator("footer")).toContainText(name)
    expect(await page.title()).toContain(name)
    await page.screenshot({
      path: info.outputPath("saved-school-branding.png"),
      fullPage: true,
    })
    await logout(page)
    for (const role of ["teacher", "student"] as const) {
      await login(page, role)
      await expect(
        page.locator("header").getByText(name, { exact: true })
      ).toBeVisible({ timeout: 120_000 })
      const image = await page.request.get("/api/school-logo")
      expect(image.status()).toBe(200)
      expect(await image.body()).toEqual(canonical)
      const denied = await page.request.patch("/api/school-settings", {
        headers: { origin: new URL(page.url()).origin },
        data: { name: "Denied", version: replacement.school.brandingVersion },
      })
      expect([401, 403]).toContain(denied.status())
      await page.goto("/settings/account")
      await expect(page.getByLabel("School name", { exact: true })).toHaveCount(
        0
      )
      await logout(page)
    }
    await login(page, "other")
    const otherWorkspace = await page.request.get("/api/workspace")
    expect((await otherWorkspace.json()).schoolId).toBe(
      "b1000000-0000-4000-8000-000000000002"
    )
    expect((await page.request.get("/api/school-logo")).status()).toBe(404)
    await logout(page)
    await login(page, "admin")
    await page.goto("/settings/account")
    await expect(
      page.getByRole("button", { name: "Remove school logo", exact: true })
    ).toBeVisible({ timeout: 120_000 })
    page.once("dialog", (dialog) => void dialog.accept())
    await save(page, "Remove school logo", "/logo", "DELETE", 200)
    await page.reload()
    await expect(
      page.getByRole("button", { name: "Save school logo", exact: true })
    ).toBeVisible({ timeout: 120_000 })
    expect((await page.request.get("/api/school-logo")).status()).toBe(404)
    await page.setViewportSize({ width: 390, height: 844 })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true)
    await page.screenshot({
      path: info.outputPath("settings-mobile.png"),
      fullPage: true,
    })
    await logout(page)
  })
})
