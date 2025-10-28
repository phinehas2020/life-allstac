"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useToast } from "@/lib/hooks/use-toast"

interface ProfileFormState {
  username: string
  bio: string
  avatarUrl: string
  email: string
}

export default function SettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [form, setForm] = useState<ProfileFormState>({
    username: "",
    bio: "",
    avatarUrl: "",
    email: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let isMounted = true

    const fetchProfile = async () => {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/login")
        return
      }

      const { data, error } = await supabase
        .from("users")
        .select("username, bio, avatar_url, email")
        .eq("id", user.id)
        .single()

      if (error) {
        console.error("Failed to load profile", error)
        toast({
          title: "Error loading profile",
          description: error.message,
          variant: "destructive",
        })
      } else if (data && isMounted) {
        setForm({
          username: data.username ?? "",
          bio: data.bio ?? "",
          avatarUrl: data.avatar_url ?? "",
          email: data.email ?? "",
        })
      }

      if (isMounted) {
        setLoading(false)
      }
    }

    fetchProfile()

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange = (
    field: keyof ProfileFormState,
    value: string,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.username.trim()) {
      toast({
        title: "Username required",
        description: "Please provide a username before saving.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.replace("/login")
      return
    }

    const updates = {
      username: form.username.trim(),
      bio: form.bio.trim() || null,
      avatar_url: form.avatarUrl.trim() || null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", user.id)

    if (error) {
      console.error("Failed to update profile", error)
      toast({
        title: "Profile update failed",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Profile updated",
        description: "Your profile changes are saved.",
      })
      router.refresh()
    }

    setSaving(false)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
        <p className="text-muted-foreground">
          Update how your profile appears to the community.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            These details are visible on your public profile page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
              <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
              <div className="h-[140px] w-full rounded-md bg-muted animate-pulse" />
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  disabled
                  className="opacity-80"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={(event) => handleChange("username", event.target.value)}
                  placeholder="yourname"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="avatar">Avatar URL</Label>
                <Input
                  id="avatar"
                  value={form.avatarUrl}
                  onChange={(event) => handleChange("avatarUrl", event.target.value)}
                  placeholder="https://..."
                />
                <p className="text-xs text-muted-foreground">
                  Paste an externally hosted image URL for now. Upload support is coming soon.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={form.bio}
                  onChange={(event) => handleChange("bio", event.target.value)}
                  placeholder="Share a short introduction about yourself."
                  rows={5}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save profile
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
