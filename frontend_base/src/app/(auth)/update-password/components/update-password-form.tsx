"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
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
import { createClient } from "@/lib/supabase/client"

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
})

type Values = z.infer<typeof schema>

export function UpdatePasswordForm() {
  const [message, setMessage] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "" },
  })

  async function onSubmit(values: Values) {
    setIsSubmitting(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: values.password })

      if (error) {
        setMessage("Your password could not be updated. Open the newest reset link and try again.")
        return
      }

      window.location.href = "/home"
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Password update is not available.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Update password</CardTitle>
        <CardDescription>Choose a new password for your IsKool account.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {message && (
              <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
                {message}
              </p>
            )}
            <Button type="submit" className="h-11 rounded-xl" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update password"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
