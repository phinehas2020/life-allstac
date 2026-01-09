"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  Bell,
  Calendar,
  Compass,
  LayoutGrid,
  Settings,
  Trophy,
  Upload,
  User,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const STORAGE_KEY = "life_allstac_onboarding_seen_v1"

const onboardingSteps = [
  {
    title: "Discover what’s new",
    description: "Browse the Home feed for curated highlights or switch to Following to see creators you love.",
    href: "/",
    icon: LayoutGrid,
    cta: "Go to Home",
  },
  {
    title: "Explore the community",
    description: "Search the Explore page to find fresh inspiration, trending topics, and new creators.",
    href: "/explore",
    icon: Compass,
    cta: "Explore now",
  },
  {
    title: "Join events & sessions",
    description: "Find upcoming Events and manage your Sessions in one place—perfect for planning shoots.",
    href: "/events",
    icon: Calendar,
    cta: "View events",
  },
  {
    title: "Meet photographers",
    description: "Discover photographers, follow their work, and build your creative network.",
    href: "/photographers",
    icon: Trophy,
    cta: "Find photographers",
  },
  {
    title: "Upload your work",
    description: "Share your best photos with the community and get feedback through likes and comments.",
    href: "/upload",
    icon: Upload,
    cta: "Upload a photo",
  },
  {
    title: "Stay connected",
    description: "Check Notifications for updates, and personalize your Profile and Settings anytime.",
    href: "/notifications",
    icon: Bell,
    cta: "Check notifications",
  },
]

export function OnboardingModal() {
  const [open, setOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const checkOnboarding = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const seen = window.localStorage.getItem(STORAGE_KEY)
      if (!seen) {
        setOpen(true)
      }
    }

    checkOnboarding()
  }, [supabase])

  const handleClose = () => {
    window.localStorage.setItem(STORAGE_KEY, "true")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : handleClose())}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-3xl flex flex-col gap-0 p-0 overflow-hidden rounded-xl">
        <div className="border-b border-border/70 px-6 py-5 shrink-0">
          <DialogHeader className="space-y-2 pr-6">
            <DialogTitle className="text-2xl font-semibold text-foreground">
              Welcome to Life.Allstac
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              Here’s a quick, step-by-step guide to the features you can use right away.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            {onboardingSteps.map((step, index) => {
              const Icon = step.icon
              return (
                <div
                  key={step.title}
                  className="flex h-full flex-col gap-3 rounded-xl border border-border/60 bg-secondary/30 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Step {index + 1}</p>
                      <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  <Button asChild variant="ghost" className="w-fit px-0 text-primary hover:bg-transparent">
                    <Link href={step.href}>{step.cta}</Link>
                  </Button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border/70 px-6 py-5 shrink-0 sm:flex-row sm:items-center sm:justify-between bg-background">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>Need to update your profile? Visit Settings anytime.</span>
            <Link href="/settings" className="inline-flex items-center gap-1 text-primary hover:underline">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </div>
          <Button onClick={handleClose} className="rounded-full px-6">
            Got it, let’s go
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
