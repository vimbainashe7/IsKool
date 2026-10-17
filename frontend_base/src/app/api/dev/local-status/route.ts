import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { realpathSync } from "node:fs"
import { NextRequest, NextResponse } from "next/server"
import { developmentAccountsEnabled } from "@/lib/auth/development-accounts"

export const runtime = "nodejs"
export function GET(request: NextRequest) {
  if (!developmentAccountsEnabled(request.headers)) return new NextResponse(null, { status: 404 })
  const checkout = createHash("sha256").update(realpathSync(process.cwd())).digest("hex")
  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim()
  return NextResponse.json({
    service: "iskool-frontend", checkout, head, node: process.versions.node,
    mode: process.env.ISKOOL_ENABLE_DEMO === "false" && process.env.NEXT_PUBLIC_ISKOOL_DEMO === "false" &&
      process.env.ISKOOL_APS_API_URL === "http://127.0.0.1:3001/api/v1" &&
      process.env.ISKOOL_SAMS_API_URL === "http://127.0.0.1:3002/api/v1" ? "live" : "preview",
  }, { headers: { "Cache-Control": "no-store" } })
}
