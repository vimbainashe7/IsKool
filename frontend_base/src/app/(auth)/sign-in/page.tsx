import { headers } from "next/headers"
import { developmentAccountsEnabled } from "@/lib/auth/development-accounts"
import { SignInScreen } from "./components/sign-in-screen"
export default async function Page() {
  return (
    <SignInScreen
      developmentAccounts={developmentAccountsEnabled(await headers())}
    />
  )
}
