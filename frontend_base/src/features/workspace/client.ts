import {
  workspaceSchema,
  type Mutation,
  type MutationResult,
} from "./contracts"
export async function readWorkspace(signal?: AbortSignal) {
  const response = await fetch("/api/workspace", { cache: "no-store", signal })
  if (response.status === 401)
    throw new Error("Your session has expired. Sign in again.")
  if (!response.ok)
    throw new Error("Your workspace could not be loaded. Try again.")
  return workspaceSchema.parse(await response.json())
}
export async function mutateWorkspace(
  mutation: Mutation
): Promise<MutationResult> {
  const response = await fetch("/api/workspace", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(mutation),
  })
  const result = await response.json().catch(() => null)
  if (!response.ok)
    throw new Error(
      typeof result?.error === "string"
        ? result.error
        : "This change could not be saved. Try again."
    )
  return result
}
