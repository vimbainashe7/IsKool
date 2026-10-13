import { test, expect } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
const sizes = [
  [1440, 900],
  [1280, 800],
  [1024, 768],
  [768, 1024],
  [390, 844],
  [360, 800],
]
test("teacher dashboard composition, quick links and keyboard", async ({
  page,
}) => {
  test.setTimeout(180000)
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text())
  })
  await page.goto("/api/dev/demo-login?role=teacher")
  await expect(
    page.getByRole("button", { name: "Search IsKool" })
  ).toBeEnabled()
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1
      ),
      `${width}px overflow`
    ).toBe(false)
    const hero = await page
      .getByRole("region", { name: "Teacher welcome" })
      .boundingBox()
    expect(hero!.height).toBeLessThanOrEqual(190)
    const plan = await page
      .getByRole("heading", { name: "Today's Plan", exact: true })
      .boundingBox()
    const docs = await page
      .getByRole("heading", { name: "Documents", exact: true })
      .boundingBox()
    const progress = await page
      .getByRole("heading", { name: "Class Progress", exact: true })
      .boundingBox()
    if (width >= 1200) {
      expect(Math.abs(plan!.y - docs!.y)).toBeLessThan(3)
      expect(Math.abs(plan!.y - progress!.y)).toBeLessThan(3)
      expect(progress!.x).toBeGreaterThan(docs!.x)
      expect(plan!.y).toBeLessThan(650)
    }
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze()
    expect(axe.violations, `${width}px`).toEqual([])
  }
  await expect(
    page.getByRole("textbox", {
      name: /Search submissions awaiting|Search today's/,
    })
  ).toHaveCount(0)
  await page.setViewportSize({ width: 1440, height: 900 })
  const quick = page.getByRole("region", { name: "Quick Links" })
  await expect(quick.getByRole("link")).toHaveCount(6)
  await quick.getByRole("link", { name: "My Classes", exact: true }).focus()
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/teacher\/classes$/)
  expect(errors).toEqual([])
})
for (const route of [
  "classes",
  "classes/class-1",
  "assignments",
  "assignments/new",
  "materials",
  "submissions",
  "gradebook",
  "ai",
  "timetable",
  "attendance",
  "notifications",
  "search",
  "settings/account",
]) {
  test(`teacher ${route}: responsive layout and accessibility`, async ({
    page,
  }) => {
    test.setTimeout(180000)
    const errors: string[] = []
    page.on("pageerror", (e) => errors.push(e.message))
    await page.goto("/api/dev/demo-login?role=teacher")
    await page.goto(
      route === "search" || route.startsWith("settings/")
        ? `/${route}`
        : `/teacher/${route}`
    )
    await expect(
      page.getByRole("button", { name: "Search IsKool" })
    ).toBeEnabled()
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    if (route === "gradebook")
      await expect(page.getByLabel("Assessment", { exact: true })).toBeVisible()
    if (route === "ai")
      await expect(
        page.getByRole("button", { name: /Compile Notes/ }).first()
      ).toBeVisible()
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height })
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1
        ),
        `${route} ${width}`
      ).toBe(false)
    }
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 })
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
      expect(axe.violations, `${route} ${width}`).toEqual([])
    }
    expect(errors).toEqual([])
  })
}
test("teacher sidebar destinations, filters, timetable and dark/reduced motion", async ({
  page,
}) => {
  test.setTimeout(180000)
  await page.goto("/api/dev/demo-login?role=teacher")
  const sidebar = page.locator('[data-sidebar="sidebar"]').first()
  const names = [
    "Dashboard",
    "Classes",
    "Assignments",
    "Teaching materials",
    "Submission review",
    "Gradebook",
    "AI Studio",
    "Timetable",
    "Attendance",
    "Notifications",
    "Search",
    "Settings",
  ]
  for (const name of names) {
    const link = sidebar.getByRole("link", { name, exact: true })
    const href = await link.getAttribute("href")
    await link.click()
    await expect(page).toHaveURL(new RegExp(`${href}(?:/account)?$`))
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  }
  await page.goto("/teacher/classes")
  await page.getByLabel("Search your classes").fill("Mathematics")
  await expect(
    page.getByRole("link", { name: "English 4A", exact: true })
  ).toHaveCount(0)
  await page.goto("/teacher/assignments")
  await page.getByLabel("Status", { exact: true }).selectOption("draft")
  await expect(
    page.getByRole("link", {
      name: "Algebra: simultaneous equations",
      exact: true,
    })
  ).toHaveCount(0)
  await page.goto("/teacher/timetable")
  await page.getByLabel("Timetable view").selectOption("today")
  await expect(page.getByText("Today", { exact: true }).last()).toBeVisible()
  await page.goto("/teacher/dashboard")
  await expect(
    page.getByRole("button", { name: "Search IsKool" })
  ).toBeEnabled()
  await page.evaluate(() => {
    localStorage.setItem("theme", "dark")
    document.documentElement.classList.add("dark")
  })
  const audit = await new AxeBuilder({ page })
    .include("main")
    .exclude("footer")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze()
  expect(audit.violations).toEqual([])
  await page.screenshot({
    path: "docs/frontend/evidence/teacher-redesign/after-dashboard-dark-1440.png",
    fullPage: true,
  })
  await page.emulateMedia({ reducedMotion: "reduce" })
  const duration = await page
    .getByRole("region", { name: "Quick Links" })
    .getByRole("link")
    .first()
    .evaluate((e) => getComputedStyle(e).transitionDuration)
  expect(duration.split(",").every((d) => parseFloat(d) <= 0.00001)).toBe(true)
})
