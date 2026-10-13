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
const routes = [
  "dashboard",
  "classes",
  "classes/class-1",
  "timetable",
  "users",
  "users/student-1",
  "students",
  "teachers",
  "enrollments",
  "roles",
  "audit",
  "attendance",
  "finance",
  "staff",
  "reports",
  "settings",
]
for (const route of routes) {
  test(`admin ${route}: responsive layout and accessibility`, async ({
    page,
  }) => {
    test.setTimeout(180000)
    const errors: string[] = []
    page.on("pageerror", (e) => errors.push(e.message))
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text())
    })
    await page.goto("/api/dev/demo-login?role=admin")
    if (route !== "dashboard") await page.goto(`/admin/${route}`)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Search IsKool" })
    ).toBeEnabled()
    await expect(
      page.locator("main fieldset[aria-busy]").first()
    ).toHaveAttribute("aria-busy", "false")
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height })
      await expect
        .poll(
          () =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1
            ),
          { message: `${route} ${width}px overflow` }
        )
        .toBe(true)
      if (route === "dashboard" || width === 1440 || width === 390) {
        const audit = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
        expect(audit.violations, `${route} ${width}px accessibility`).toEqual(
          []
        )
      }
    }
    if (route === "dashboard") {
      await expect(
        page.getByRole("heading", { name: "Admissions Pipeline", exact: true })
      ).toBeVisible()
      await expect(
        page.getByRole("heading", { name: "Upcoming Events", exact: true })
      ).toBeVisible()
      await expect(
        page.getByRole("heading", { name: "Fee Collection", exact: true })
      ).toBeVisible()
      await expect(
        page.getByRole("heading", { name: "Reports Overview", exact: true })
      ).toBeVisible()
      await expect(page.locator("main").getByRole("textbox")).toHaveCount(0)
      await expect(page.getByText(/Development preview —/)).toHaveCount(0)
      await page.setViewportSize({ width: 1440, height: 900 })
      const pipeline = await page
        .getByRole("heading", { name: "Admissions Pipeline", exact: true })
        .boundingBox()
      const events = await page
        .getByRole("heading", { name: "Upcoming Events", exact: true })
        .boundingBox()
      const fees = await page
        .getByRole("heading", { name: "Fee Collection", exact: true })
        .boundingBox()
      expect(Math.abs(pipeline!.y - events!.y)).toBeLessThan(3)
      expect(fees!.y).toBeLessThan(800)
    }
    expect(errors).toEqual([])
  })
}
test("admin sidebar, attention drill-downs, filters and keyboard", async ({
  page,
}) => {
  test.setTimeout(180000)
  await page.goto("/api/dev/demo-login?role=admin")
  await page.goto("/admin/reports")
  await expect(
    page.getByRole("button", { name: "Search IsKool" })
  ).toBeEnabled()
  await expect(
    page.locator("main fieldset[aria-busy]").first()
  ).toHaveAttribute("aria-busy", "false")
  const sidebar = page.locator('[data-sidebar="sidebar"]').first()
  const headings: Record<string, string | RegExp> = {
    Dashboard: /Welcome back,/,
    Classes: "School classes",
    Timetable: "School timetable",
    Users: "User management",
    Students: "Student records",
    Teachers: "Teachers",
    Enrollment: "Enrollment",
    "Roles and access": "Roles and access",
    "Audit history": "Audit history",
    Attendance: "Attendance exceptions",
    Finance: "Finance",
    "Staff and HR": "Staff and HR",
    Reports: "Reports",
  }
  for (const name of [
    "Dashboard",
    "Classes",
    "Timetable",
    "Users",
    "Students",
    "Teachers",
    "Enrollment",
    "Roles and access",
    "Audit history",
    "Attendance",
    "Finance",
    "Staff and HR",
    "Reports",
  ]) {
    const link = sidebar.getByRole("link", { name, exact: true })
    const href = await link.getAttribute("href")
    await link.click()
    await expect(page).toHaveURL(new RegExp(`${href}$`))
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      headings[name]
    )
    await expect(
      page.locator("main fieldset[aria-busy]").first()
    ).toHaveAttribute("aria-busy", "false")
  }
  await page.goto("/admin/dashboard")
  await page
    .getByRole("region", { name: "Needs attention" })
    .getByRole("link", { name: /pending invitations/ })
    .click()
  await expect(
    page.getByLabel("Membership status", { exact: true })
  ).toHaveValue("invited")
  await expect(
    page.getByRole("link", { name: "Learner 001", exact: true }).first()
  ).toHaveCount(0)
  await page
    .getByLabel("Membership status", { exact: true })
    .selectOption("all")
  await page.getByLabel("Search users", { exact: true }).fill("Learner 001")
  await page
    .getByRole("link", { name: "Learner 001", exact: true })
    .first()
    .focus()
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/admin\/users\/student-1$/)
  await page.goto("/admin/students?enrollment=unassigned")
  await expect(page.getByLabel("Enrollment", { exact: true })).toHaveValue(
    "unassigned"
  )
  await expect(
    page.getByText("No matching memberships", { exact: true })
  ).toBeVisible()
  await page.goto("/admin/classes")
  await page
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", { name: "English 4A", exact: true }),
    })
    .getByRole("link", { name: "Assign teacher", exact: true })
    .click()
  await expect(page.getByLabel("Class", { exact: true })).toHaveValue("class-2")
  await page.goto("/admin/timetable")
  await page.getByLabel("Timetable view").selectOption("today")
  await expect(page.getByRole("heading", { name: /· Today/ })).toHaveCount(1)
  await page.goto("/admin/reports")
  await page.getByLabel("Search reports").fill("Fee Collection")
  await expect(
    page.getByRole("heading", { name: "Fee Collection Report", exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Student Summary", exact: true })
  ).toHaveCount(0)
})
test("admin dark mode, reduced motion and honest unavailable operations", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/api/dev/demo-login?role=admin")
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
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" })
  await page.screenshot({
    path: "docs/frontend/evidence/admin-redesign/after-dashboard-dark-1440.png",
    fullPage: true,
  })
  await page.emulateMedia({ reducedMotion: "reduce" })
  const duration = await page
    .getByRole("link", { name: /Student Summary Memberships/ })
    .evaluate((e) => getComputedStyle(e).transitionDuration)
  expect(duration.split(",").every((d) => parseFloat(d) <= 0.00001)).toBe(true)
  await page.goto("/admin/finance")
  await expect(page.getByText("No rate", { exact: true })).toBeVisible()
  await expect(page.locator("main")).not.toContainText(/\$|₹|ZiG|\d+%/)
  await page.goto("/admin/attendance")
  await expect(
    page.getByText("Attendance records are not available yet", { exact: true })
  ).toBeVisible()
})
