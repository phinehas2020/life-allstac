"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Loader2, KeyRound } from "lucide-react"
import { useToast } from "@/lib/hooks/use-toast"
import { type User } from "@/lib/types/database"

interface UserActionsProps {
  user: User
}

export function UserActions({ user }: UserActionsProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const handleResetPassword = async () => {
    if (!confirm(`Are you sure you want to send a password reset email to ${user.email}?`)) return

    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email!, {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      })

      if (error) throw error

      toast({
        title: "Email sent",
        description: `Password reset email sent to ${user.email}`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Link href={`/profile/${user.username}`}>
        <Button variant="ghost" size="sm" title="View Profile">
            View Profile
        </Button>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleResetPassword}
        disabled={loading}
        title="Send Password Reset Email"
        className="h-8 w-8"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        <span className="sr-only">Reset Password</span>
      </Button>
    </div>
  )
}
