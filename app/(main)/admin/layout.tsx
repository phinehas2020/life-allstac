import type { ReactNode } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { User } from "@/lib/types/database"

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/photographers", label: "Photographers" },
]

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  type AdminFlag = Pick<User, "is_admin">

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle<AdminFlag>()

  if (!profile?.is_admin) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="border-b bg-white/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Admin Console</h1>
            <p className="text-sm text-muted-foreground">
              Monitor community health and manage contributors
            </p>
          </div>
          <nav className="flex flex-wrap gap-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-muted-foreground/20 hover:text-foreground hover:bg-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-8">{children}</div>
    </div>
  )
}
