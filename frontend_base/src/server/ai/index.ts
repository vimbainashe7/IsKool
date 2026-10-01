import type { TeacherAiProvider } from "./provider"
import { MockTeacherAiProvider } from "./mock-provider"

export function getTeacherAiProvider(): TeacherAiProvider {
  if (process.env.AI_PROVIDER === "mock" || process.env.NODE_ENV !== "production") {
    return new MockTeacherAiProvider()
  }

  throw new Error("AI provider is not configured. Set AI_PROVIDER explicitly on the server.")
}
