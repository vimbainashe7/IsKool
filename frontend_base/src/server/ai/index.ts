
import "server-only"
import { canUseDemoSession } from "@/dev/demo-session"
import type { TeacherAiProvider } from "./provider"
import { MockTeacherAiProvider } from "./mock-provider"

export function getTeacherAiProvider(): TeacherAiProvider {
  if (canUseDemoSession() && process.env.AI_PROVIDER === "mock") {
    return new MockTeacherAiProvider()
  }

  throw new Error("AI provider is not configured. Set AI_PROVIDER explicitly on the server.")
}
