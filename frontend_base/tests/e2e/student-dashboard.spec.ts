import { test, expect } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
test("student composition, calendar interaction, keyboard links and six viewports", async ({
  page,
}) => {
  test.setTimeout(180000)
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  await page.goto("/api/dev/demo-login?role=student")
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Welcome back"
  )
  const links = page.locator('a[aria-label^="Open "]')
  expect(await links.count()).toBeGreaterThan(0)
  await expect(
    page.getByRole("textbox", { name: /Search today's|Search assignments/ })
  ).toHaveCount(0)
  await expect(
    page.getByRole("link", { name: "Open assignments", exact: true })
  ).toHaveCount(0)
  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
    [1024, 768],
    [768, 1024],
    [390, 844],
    [360, 800],
  ]) {
    await page.setViewportSize({ width, height })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1
      ),
      `overflow at ${width}`
    ).toBe(false)
    const welcome = await page
      .getByRole("region", { name: "Welcome" })
      .boundingBox()
    expect(welcome!.height).toBeLessThanOrEqual(190)
    const courses = await page
      .getByRole("region", { name: "My Courses" })
      .boundingBox()
    const tasks = await page
      .getByRole("region", { name: "Upcoming Tasks" })
      .boundingBox()
    const calendar = await page
      .getByRole("region", { name: "Your calendar" })
      .boundingBox()
    if (width >= 1200) {
      expect(calendar!.x).toBeGreaterThan(welcome!.x + welcome!.width)
      expect(Math.abs(calendar!.y - welcome!.y)).toBeLessThan(2)
      expect(tasks!.y).toBeGreaterThan(calendar!.y)
    }
    if (width < 768) {
      expect(tasks!.y).toBeLessThan(courses!.y)
      expect(calendar!.y).toBeGreaterThan(courses!.y)
    }
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze()
    expect(axe.violations, `${width}px`).toEqual([])
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  await links.first().focus()
  await expect(links.first()).toBeFocused()
  await links.first().press("Enter")
  await expect(page).toHaveURL(/student\/classes\//)
  await page.goto("/student/dashboard")
  await page.getByRole("link", { name: "See all", exact: false }).click()
  await expect(page).toHaveURL(/student\/assignments$/)
  await page.goto("/student/dashboard")
  const calendar = page.getByRole("region", { name: "Your calendar" })
  await calendar.getByRole("button", { name: /next month/i }).click()
  await calendar.getByRole("button", { name: /previous month/i }).click()
  await calendar.locator("button[data-day]").first().click()
  await expect(calendar.locator('div[aria-live="polite"]')).toBeVisible()
  expect(errors).toEqual([])
})
test("all existing student sidebar destinations still navigate", async ({
  page,
}) => {
  test.setTimeout(120000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/api/dev/demo-login?role=student")
  for (const name of [
    "Dashboard",
    "Classes",
    "Assignments",
    "Grades and feedback",
    "Notes and resources",
    "Timetable",
    "Notifications",
    "Search",
    "Settings",
    "Help",
  ]) {
    const link = page
      .locator('[data-sidebar="sidebar"]')
      .first()
      .getByRole("link", { name, exact: true })
    const href = await link.getAttribute("href")
    expect(href).toBeTruthy()
    await link.click()
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    expect(page.url()).not.toContain("/errors/")
  }
})

test("student dashboard dark surfaces and reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/api/dev/demo-login?role=student")
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Welcome back"
  )
  await page.evaluate(() => document.documentElement.classList.add("dark"))
  const result = await new AxeBuilder({ page })
    .include("#workspace-content")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze()
  expect(result.violations).toEqual([])
  await page.screenshot({
    path: "docs/frontend/evidence/student-redesign/after-student-dark-1280.png",
    fullPage: true,
  })
  const card = page
    .locator('a[aria-label^="Open "]')
    .first()
    .locator('[data-slot="card"]')
  expect(
    await card.evaluate((element) =>
      parseFloat(getComputedStyle(element).transitionDuration)
    )
  ).toBeLessThanOrEqual(0.00001)
})
