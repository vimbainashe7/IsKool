import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { SignInScreen } from "@/app/(auth)/sign-in/components/sign-in-screen"
import { developmentAccountsEnabled } from "@/lib/auth/development-accounts"

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}))
afterEach(() => vi.unstubAllGlobals())

describe("local development account selection", () => {
  it.each(["Student", "Teacher", "Admin"])(
    "fills %s without authenticating or moving focus",
    (role) => {
      const fetch = vi.fn()
      vi.stubGlobal("fetch", fetch)
      render(<SignInScreen developmentAccounts />)
      expect(screen.queryByText("Development accounts")).not.toBeInTheDocument()
      expect(
        screen.queryByLabelText("Development seed password")
      ).not.toBeInTheDocument()
      const button = screen.getByRole("button", { name: role })
      button.focus()
      fireEvent.click(button)
      expect(screen.getByLabelText("Email")).toHaveValue(
        `${role.toLowerCase()}.alpha@example.test`
      )
      expect(button).toHaveFocus()
      expect(button).toHaveAttribute("aria-pressed", "true")
      expect(fetch).not.toHaveBeenCalled()
    }
  )

  it("keeps a manually entered password only in the mounted form", () => {
    const localWrite = vi.spyOn(Storage.prototype, "setItem")
    const log = vi.spyOn(console, "log")
    const { unmount } = render(<SignInScreen developmentAccounts />)
    const helper = screen.getByLabelText("Password", { exact: true })
    fireEvent.change(helper, { target: { value: "temporary-test-value" } })
    for (const role of ["Student", "Teacher", "Admin"]) {
      fireEvent.click(screen.getByRole("button", { name: role }))
      expect(screen.getByLabelText("Password", { exact: true })).toHaveValue(
        "temporary-test-value"
      )
    }
    expect(helper).toHaveAttribute("type", "password")
    expect(helper).toHaveAttribute("autocomplete", "current-password")
    expect(screen.queryByText("temporary-test-value")).not.toBeInTheDocument()
    expect(localWrite).not.toHaveBeenCalled()
    expect(log).not.toHaveBeenCalled()
    unmount()
    render(<SignInScreen developmentAccounts />)
    expect(screen.getByLabelText("Password", { exact: true })).toHaveValue("")
  })

  it("keeps invalid credentials subject to real login rejection", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "Invalid credentials" }),
      })
    vi.stubGlobal("fetch", fetch)
    render(<SignInScreen developmentAccounts />)
    fireEvent.click(screen.getByRole("button", { name: "Admin" }))
    fireEvent.change(screen.getByLabelText("Password", { exact: true }), {
      target: { value: "invalid-password" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }))
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid credentials")
    )
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      email: "admin.alpha@example.test",
      password: "invalid-password",
    })
  })

  it("is absent without server authorization", () => {
    render(<SignInScreen developmentAccounts={false} />)
    expect(
      screen.queryByRole("button", { name: "Student" })
    ).not.toBeInTheDocument()
  })
})

describe("server development guard", () => {
  const env = {
    NODE_ENV: "development",
    ISKOOL_DEV_ACCOUNTS: "true",
    ISKOOL_DEV_LOOPBACK: "127.0.0.1",
  } as NodeJS.ProcessEnv
  it("allows an explicitly opted-in loopback server", () => {
    expect(
      developmentAccountsEnabled(new Headers({ host: "localhost:3000" }), env)
    ).toBe(true)
    expect(
      developmentAccountsEnabled(
        new Headers({
          host: "localhost:3000",
          "x-forwarded-host": "localhost:3000",
        }),
        env
      )
    ).toBe(true)
  })
  it.each([
    { NODE_ENV: "production" },
    { NODE_ENV: "test" },
    { ISKOOL_DEV_ACCOUNTS: "false" },
    { ISKOOL_DEV_LOOPBACK: "" },
    { VERCEL: "1" },
    { CF_PAGES: "1" },
    { CI: "true" },
  ])("fails closed for %j", (override) => {
    expect(
      developmentAccountsEnabled(new Headers({ host: "localhost:3000" }), {
        ...env,
        ...override,
      } as NodeJS.ProcessEnv)
    ).toBe(false)
  })
  it.each([
    { host: "example.com:3000" },
    { host: "localhost.evil:3000" },
    { host: "localhost:3000", "x-forwarded-host": "remote.example:3000" },
    { host: "localhost:3000", forwarded: "host=localhost:3000" },
  ])("rejects external or forwarded requests %j", (headers) => {
    const requestHeaders = new Headers()
    for (const [key, value] of Object.entries(headers))
      if (value) requestHeaders.set(key, value)
    expect(developmentAccountsEnabled(requestHeaders, env)).toBe(false)
  })
})
