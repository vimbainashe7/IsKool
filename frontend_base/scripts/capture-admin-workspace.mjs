import { chromium } from "@playwright/test"
import { mkdir } from "node:fs/promises"
const phase = process.argv[2] === "before" ? "before" : "after"
const directory = "docs/frontend/evidence/admin-redesign"
await mkdir(directory, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage()
page.setDefaultNavigationTimeout(120000)
try {
  await page.goto("http://localhost:3000/api/dev/demo-login?role=admin")
  for (const route of [
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
  ]) {
    await page.goto(`http://localhost:3000/admin/${route}`)
    await page.getByRole("heading", { level: 1 }).first().waitFor()
    await page.waitForFunction(
      () =>
        !document.querySelector('button[aria-label="Search IsKool"]')?.disabled
    )
    await page.addStyleTag({
      content: "nextjs-portal { display: none !important; }",
    })
    await page.waitForFunction(
      () => !document.querySelector('main fieldset[aria-busy="true"]')
    )
    for (const [width, height] of route === "dashboard" && phase === "after"
      ? [
          [1440, 900],
          [1280, 800],
          [1024, 768],
          [768, 1024],
          [390, 844],
          [360, 800],
        ]
      : [
          [1440, 900],
          [390, 844],
        ]) {
      await page.setViewportSize({ width, height })
      await page.screenshot({
        path: `${directory}/${phase}-${route.replaceAll("/", "-")}-${width}.png`,
        fullPage: true,
        animations: "disabled",
      })
    }
    console.log(`${phase}: /admin/${route}`)
  }
} finally {
  await browser.close()
}
