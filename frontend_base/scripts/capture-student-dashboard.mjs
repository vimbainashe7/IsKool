import { chromium } from "@playwright/test"
import { mkdir } from "node:fs/promises"
const phase = process.argv[2] === "before" ? "before" : "after"
const origin = process.env.ISKOOL_CAPTURE_URL ?? "http://localhost:3100"
const directory = "docs/frontend/evidence/student-redesign"
await mkdir(directory, { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  page.on("pageerror", (error) =>
    console.error(`Browser error: ${error.message}`)
  )
  for (const role of ["student", "teacher", "admin"]) {
    await page.goto(`${origin}/api/dev/demo-login?role=${role}`)
    if (!page.url().includes(`/${role}/dashboard`))
      throw new Error(
        "The server must run with the explicit preview adapter enabled."
      )
    await page.getByRole("heading", { level: 1 }).waitFor()
    const sizes =
      role === "student"
        ? phase === "before"
          ? [
              [1440, 900],
              [390, 844],
            ]
          : [
              [1440, 900],
              [1280, 800],
              [1024, 768],
              [768, 1024],
              [390, 844],
              [360, 800],
            ]
        : [[1440, 900]]
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height })
      await page.screenshot({
        path: `${directory}/${phase}-${role}-${width}.png`,
        fullPage: true,
      })
      console.log(`${phase}: ${role} ${width}x${height}`)
    }
  }
} finally {
  await browser.close()
}
