import { expect, test, type Page } from "@playwright/test"

const live = process.env.ISKOOL_LIVE_AUTH === "true"
const password = process.env.ISKOOL_TEST_PASSWORD

test.describe("live IsKool authentication", () => {
  test.skip(!live, "Set ISKOOL_LIVE_AUTH=true to run against the local APIs and live development database.")

  for (const account of [
    { role: "student", email: "student.alpha@example.test", name: "Student Alpha" },
    { role: "teacher", email: "teacher.alpha@example.test", name: "Teacher Alpha" },
    { role: "admin", email: "admin.alpha@example.test", name: "Admin Alpha" },
  ] as const) {
    test(`${account.role} can sign in, reload, and sign out`, async ({ page }) => {
      test.setTimeout(120_000)
      if (!password) throw new Error("ISKOOL_TEST_PASSWORD is required for live auth tests.")
      await signIn(page, account.email, password)
      await expect(page).toHaveURL(new RegExp(`/${account.role}/dashboard$`), {
        timeout: 60_000,
      })
      await expect(page.getByRole("button", { name: "Profile menu" })).toBeVisible()

      await page.reload()
      await expect(page).toHaveURL(new RegExp(`/${account.role}/dashboard$`), {
        timeout: 60_000,
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
    test.setTimeout(120_000)
    if (!password) throw new Error("ISKOOL_TEST_PASSWORD is required for live auth tests.")
    await signIn(page, "student.alpha@example.test", password)
    await expect(page).toHaveURL(/\/student\/dashboard$/, { timeout: 60_000 })

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
    await expect(page).toHaveURL(/\/student\/dashboard$/, { timeout: 60_000 })
  })
})

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in")
  await page.getByRole("textbox", { name: "Email" }).fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
}
