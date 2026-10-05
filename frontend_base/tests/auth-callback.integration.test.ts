import { beforeEach, it, expect, vi } from "vitest"
import { NextRequest } from "next/server"
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  verify: vi.fn(),
  exchange: vi.fn(),
}))
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.create }))
import { GET } from "@/app/(auth)/auth/confirm/route"
beforeEach(() => {
  mocks.create.mockResolvedValue({
    auth: { verifyOtp: mocks.verify, exchangeCodeForSession: mocks.exchange },
  })
  mocks.verify.mockResolvedValue({ error: null })
  mocks.exchange.mockResolvedValue({ error: null })
})
it("rejects an invalid callback instead of pretending confirmation worked", async () => {
  mocks.verify.mockResolvedValue({ error: { message: "Expired" } })
  const response = await GET(
    new NextRequest(
      "http://localhost/auth/confirm?token_hash=hash&type=recovery&next=/update-password"
    )
  )
  expect(response.headers.get("location")).toBe(
    "http://localhost/sign-in?notice=invalid-link"
  )
})
it("exchanges recovery code and refuses an external return", async () => {
  const response = await GET(
    new NextRequest(
      "http://localhost/auth/confirm?code=code&next=https://evil.example"
    )
  )
  expect(mocks.exchange).toHaveBeenCalledWith("code")
  expect(response.headers.get("location")).toBe("http://localhost/home")
})
it("accepts verified recovery and goes to the password editor", async () => {
  const response = await GET(
    new NextRequest(
      "http://localhost/auth/confirm?token_hash=hash&type=recovery"
    )
  )
  expect(response.headers.get("location")).toBe(
    "http://localhost/update-password"
  )
})
