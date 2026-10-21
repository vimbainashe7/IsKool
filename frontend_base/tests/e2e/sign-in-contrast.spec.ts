import { expect, test } from "@playwright/test"

test.use({ trace: "off" })

test("sign-in and sign-up fit standard desktop and phone viewports", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1024, height: 640 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport)
    for (const path of ["/sign-in", "/sign-up"]) {
      await page.goto(path)
      await expect(page.getByLabel("Email", { exact: true })).toBeVisible()
      await expect(page.getByLabel("Development seed password")).toHaveCount(0)
      const bounds = await page.evaluate(() => ({
        height: document.documentElement.scrollHeight,
        width: document.documentElement.scrollWidth,
        viewportHeight: innerHeight,
        viewportWidth: innerWidth,
      }))
      expect(
        bounds.height,
        `${path} at ${viewport.width}×${viewport.height}`
      ).toBeLessThanOrEqual(bounds.viewportHeight + 1)
      expect(bounds.width).toBeLessThanOrEqual(bounds.viewportWidth + 1)
    }
  }
})

test("sign-in labels, hints and entered text remain readable with a saved dark workspace theme", async ({
  page,
}, info) => {
  await page.addInitScript(() =>
    localStorage.setItem("nextjs-ui-theme", "dark")
  )
  await page.emulateMedia({ colorScheme: "dark" })
  await page.goto("/sign-in")
  await expect(page.locator("html")).toHaveClass(/dark/)
  await page
    .getByLabel("Email", { exact: true })
    .fill("admin.alpha@example.test")
  for (const locator of [
    page.getByText("Welcome back", { exact: true }),
    page.getByText("Enter your email to continue to your school workspace", {
      exact: true,
    }),
    page.locator("label").filter({ hasText: /^Email$/ }),
    page.locator("label").filter({ hasText: /^Password$/ }),
    page.getByLabel("Email", { exact: true }),
    page.getByLabel("Password", { exact: true }),
  ]) {
    const contrast = await locator.evaluate((element) => {
      const components = getComputedStyle(element)
        .color.match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number)
      const luminance = components
        .map((value) => {
          const channel = value / 255
          return channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4
        })
        .reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0)
      // The sign-in form's designed surface is white/cream, including in dark workspace mode.
      return (0.95 + 0.05) / (luminance + 0.05)
    })
    expect(contrast).toBeGreaterThanOrEqual(4.5)
  }
  await page.screenshot({
    path: info.outputPath("sign-in-dark-preference.png"),
    fullPage: true,
  })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true)
  await page.screenshot({
    path: info.outputPath("sign-in-mobile-dark-preference.png"),
    fullPage: true,
  })
})
