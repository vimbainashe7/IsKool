"use client"
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useSyncExternalStore,
} from "react"
import type { Workspace, Mutation, MutationResult } from "./contracts"
import { readWorkspace, mutateWorkspace } from "./client"
import { Button } from "@/components/ui/button"
const subscribeHydration = () => () => {}
const hydratedSnapshot = () => true
const serverSnapshot = () => false
const Context = createContext<{
  data: Workspace
  busy: boolean
  refresh: () => Promise<void>
  mutate: (input: Mutation) => Promise<MutationResult>
} | null>(null)
export function WorkspaceProvider({
  initial,
  children,
  previewIndicator = "banner",
}: {
  initial: Workspace
  children: React.ReactNode
  previewIndicator?: "banner" | "badge"
}) {
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    hydratedSnapshot,
    serverSnapshot
  )
  const [data, setData] = useState(initial)
  useEffect(() => {
    setData(initial)
  }, [initial])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [offline, setOffline] = useState(false)
  const refresh = useCallback(async () => {
    setData(await readWorkspace())
  }, [])
  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    return () => {
      window.removeEventListener("online", on)
      window.removeEventListener("offline", off)
    }
  }, [])
  async function mutate(input: Mutation) {
    setBusy(true)
    setError("")
    try {
      const result = await mutateWorkspace(input)
      try {
        await refresh()
      } catch {
        setError(
          "Your change was saved, but the workspace could not refresh. Reload to see the latest records."
        )
      }
      return result
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "This change could not be saved."
      setError(message)
      throw new Error(message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Context.Provider value={{ data, busy, refresh, mutate }}>
      {data.mode === "demo" &&
        previewIndicator === "badge" &&
        process.env.NODE_ENV !== "production" && (
          <p
            role="status"
            className="mb-3 text-right text-[10px] text-muted-foreground"
          >
            <span
              className="rounded-full border px-2 py-1"
              title="Development fixtures and simulated services"
            >
              Dev data
            </span>
          </p>
        )}
      {data.mode === "demo" && previewIndicator === "banner" && (
        <p
          role="status"
          className="mb-4 rounded-xl border border-amber-600 bg-amber-50 p-3 text-sm text-amber-950"
        >
          Development preview — sample data and simulated services. Changes
          persist locally for this preview session.
        </p>
      )}
      {offline && (
        <p role="alert" className="mb-4 rounded-xl border p-3">
          You’re offline. Reconnect before saving changes.
        </p>
      )}
      {data.warnings.map((message) => (
        <p
          key={message}
          role="status"
          className="mb-3 rounded-xl border p-3 text-sm"
        >
          {message}
        </p>
      ))}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-destructive p-3 text-destructive"
        >
          {error}
          <Button variant="ghost" onClick={() => setError("")}>
            Dismiss
          </Button>
        </div>
      )}
      <fieldset
        disabled={!hydrated}
        className="min-w-0 border-0 p-0"
        aria-busy={!hydrated}
      >
        {children}
      </fieldset>
    </Context.Provider>
  )
}
export function useWorkspace() {
  const context = useContext(Context)
  if (!context) throw new Error("Workspace context is missing")
  return context
}
export function useUnsavedChanges(dirty: boolean) {
  useLayoutEffect(() => {
    if (!dirty) return
    const leave = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    const navigate = (event: MouseEvent) => {
      const link = (event.target as Element).closest("a[href]")
      if (
        link &&
        !window.confirm("You have unsaved changes. Leave this page?")
      ) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.addEventListener("beforeunload", leave)
    document.addEventListener("click", navigate, true)
    return () => {
      window.removeEventListener("beforeunload", leave)
      document.removeEventListener("click", navigate, true)
    }
  }, [dirty])
}
