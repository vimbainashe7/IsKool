"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { safeReturnPath } from "@/lib/auth/safe-return-path"
import { cn } from "@/lib/utils"

const loginFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type LoginFormValues = z.infer<typeof loginFormSchema>
type SchoolChoice = { id: string; name: string; roles: string[] }

export function LoginForm1({
  className,
  developmentAccounts = false,
  ...props
}: React.ComponentProps<"div"> & { developmentAccounts?: boolean }) {
  const searchParams = useSearchParams()
  const [message, setMessage] = React.useState<string | null>(null)
  const [schools, setSchools] = React.useState<SchoolChoice[]>([])
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [canDemo, setCanDemo] = React.useState(false)
  const [devPassword, setDevPassword] = React.useState("")
  const [selectedAccount, setSelectedAccount] = React.useState<string | null>(null)
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  React.useEffect(() => {
    setCanDemo(process.env.NEXT_PUBLIC_ISKOOL_DEMO === "true" && !process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NODE_ENV !== "production")
  }, [])

  async function authenticate(values: LoginFormValues, schoolId?: string) {
    setIsSubmitting(true)
    setMessage(null)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, schoolId }),
      })
      const body = (await response.json().catch(() => null)) as
        | { error?: string; code?: string; schools?: SchoolChoice[] }
        | null

      if (!response.ok) {
        if (response.status === 409 && body?.schools?.length) {
          setSchools(body.schools)
        }
        setMessage(
          response.status === 409
            ? "Choose the school you want to open."
            : body?.error ?? "Sign in failed. Check your email and password."
        )
        return
      }

      window.location.href = safeReturnPath(searchParams.get("next"))
    } catch {
      setMessage("Sign in is currently unavailable. Try again shortly.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function onSubmit(values: LoginFormValues) {
    await authenticate(values)
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-0 bg-transparent shadow-none md:bg-white/0">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>
            Enter your email to continue to your school workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-6">
                <div className="grid gap-4">
                  {developmentAccounts && (
                    <fieldset className="grid gap-3 rounded-xl border border-iskool-cream bg-iskool-cream/45 p-3" disabled={isSubmitting}>
                      <legend className="px-1 text-sm font-medium">Development accounts</legend>
                      <p id="dev-account-help" className="text-xs text-muted-foreground">
                        Live local testing. Enter your seed password once for this page. Selecting an account only fills the form.
                      </p>
                      <label htmlFor="dev-seed-password" className="text-sm font-medium">Development seed password</label>
                      <Input id="dev-seed-password" type="password" autoComplete="off" aria-describedby="dev-account-help" value={devPassword}
                        onChange={(event) => {
                          setDevPassword(event.target.value)
                          form.setValue("password", event.target.value, { shouldDirty: true, shouldValidate: true })
                        }} />
                      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Select development account">
                        {["Student", "Teacher", "Admin"].map((role) => (
                          <Button key={role} type="button" size="sm" variant={selectedAccount === role ? "default" : "outline"}
                            aria-pressed={selectedAccount === role}
                            onClick={() => {
                              setSelectedAccount(role)
                              setSchools([])
                              setMessage(null)
                              form.setValue("email", `${role.toLowerCase()}.alpha@example.test`, { shouldDirty: true, shouldValidate: true })
                              if (devPassword) form.setValue("password", devPassword, { shouldDirty: true, shouldValidate: true })
                            }}>
                            {role}
                          </Button>
                        ))}
                      </div>
                    </fieldset>
                  )}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@school.example" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center">
                          <FormLabel>Password</FormLabel>
                          <a
                            href="/forgot-password"
                            className="ml-auto text-sm underline-offset-4 hover:underline"
                          >
                            Forgot your password?
                          </a>
                        </div>
                        <FormControl>
                          <Input type="password" autoComplete="current-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {message && (
                    <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {message}
                    </p>
                  )}
                  {schools.length > 0 && (
                    <div className="grid gap-2" aria-label="Choose a school">
                      {schools.map((school) => (
                        <Button
                          key={school.id}
                          type="button"
                          variant="outline"
                          disabled={isSubmitting}
                          onClick={() => void authenticate(form.getValues(), school.id)}
                        >
                          {school.name}
                        </Button>
                      ))}
                    </div>
                  )}
                  <Button type="submit" className="h-11 w-full cursor-pointer rounded-xl" disabled={isSubmitting}>
                    {isSubmitting ? "Signing in..." : "Sign in"}
                  </Button>
                  {canDemo && (
                    <div className="grid gap-2 rounded-xl border border-iskool-cream bg-iskool-cream/45 p-3">
                      <p className="text-xs font-medium">Local frontend preview</p>
                      <div className="grid grid-cols-3 gap-2">
                        <Button asChild variant="outline" size="sm">
                          <a href="/api/dev/demo-login?role=student">Student</a>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <a href="/api/dev/demo-login?role=teacher">Teacher</a>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <a href="/api/dev/demo-login?role=admin">Admin</a>
                        </Button>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Roles are loaded from school memberships after sign in; this form cannot self-assign access.
                  </p>
                </div>
                <div className="text-center text-sm">
                  Don&apos;t have an account?{" "}
                  <a href="/sign-up" className="underline underline-offset-4">
                    Sign up
                  </a>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
