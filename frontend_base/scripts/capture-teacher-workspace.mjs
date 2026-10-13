import { chromium } from "@playwright/test"
import { mkdir } from "node:fs/promises"
const phase = process.argv[2] === "before" ? "before" : "after"
const directory = "docs/frontend/evidence/teacher-redesign"
await mkdir(directory, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage()
page.setDefaultNavigationTimeout(120000)
page.setDefaultTimeout(120000)
try {
  await page.goto("http://localhost:3000/api/dev/demo-login?role=teacher")
  for (const route of [
    "dashboard",
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
    const url =
      route === "search" || route.startsWith("settings/")
        ? `/${route}`
        : `/teacher/${route}`
    await page.goto(`http://localhost:3000${url}`)
    await page.getByRole("heading", { level: 1 }).first().waitFor()
    await page.getByRole("button", { name: "Search IsKool" }).waitFor()
    await page.waitForFunction(
      () =>
        !document.querySelector('button[aria-label="Search IsKool"]')?.disabled
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
      })
    }
    console.log(`${phase}: ${url}`)
  }
} finally {
  await browser.close()
}
