import { test, expect } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

test("student and public authentication accessibility", async ({ page }) => {
  test.setTimeout(120000)
  for (const route of [
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/update-password",
  ]) {
    await page.goto(route)
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze()
    expect(result.violations, route).toEqual([])
  }
  await page.goto("/api/dev/demo-login?role=student")
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Student dashboard"
  )
  for (const route of [
    "/student/dashboard",
    "/student/assignments/assignment-1",
    "/student/grades",
    "/student/notes",
  ]) {
    await page.goto(route)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze()
    expect(result.violations, route).toEqual([])
  }
})
