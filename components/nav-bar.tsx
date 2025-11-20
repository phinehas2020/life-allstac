"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Home, Search, Upload, User, Calendar, LogOut, Menu, X, Trophy, Shield } from "lucide-react"
import { useEffect, useState } from "react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import type { User as UserData } from "@/lib/types/database"

export function NavBar() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        const { data } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single()
        
        if (data) {
          setUserData(data)
        }
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        getUser()
      } else {
        setUserData(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/explore", label: "Explore", icon: Search },
    { href: "/events", label: "Events", icon: Calendar },
    { href: "/photographers", label: "Photographers", icon: Trophy },
  ]

  const adminItems = userData?.is_admin ? [
    { href: "/admin/photographers", label: "Manage", icon: Shield },
  ] : []

  return (
    <nav
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm"
          : "bg-white border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <span className="text-2xl md:text-3xl font-bold tracking-tighter text-primary group-hover:opacity-80 transition-opacity font-heading">
              Life.Allstac
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1 bg-secondary/50 p-1.5 rounded-full border border-border/50 backdrop-blur-sm">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-white text-primary shadow-sm"
                      : "text-gray-600 hover:text-primary hover:bg-white/50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "stroke-[2.5px]" : ""}`} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
            {adminItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-white text-primary shadow-sm"
                      : "text-gray-600 hover:text-primary hover:bg-white/50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "stroke-[2.5px]" : ""}`} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* User Actions */}
          <div className="hidden md:flex items-center space-x-3">
            <Link href="/upload">
                <Button className="rounded-full px-6 font-semibold shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                </Button>
            </Link>

            {user ? (
              <>
                <Link href={`/profile/${userData?.username || user.id}`}>
                  <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 hover:bg-secondary">
                    <User className="w-5 h-5" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="rounded-full w-10 h-10 hover:bg-secondary text-gray-500 hover:text-destructive"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </>
            ) : (
              <div className="flex items-center space-x-2 pl-2">
                <Link href="/login">
                  <Button variant="ghost" className="rounded-full font-medium hover:bg-secondary">
                    Sign in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="rounded-full px-5 font-semibold shadow-md">
                    Sign up
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            <Link href="/upload">
                <Button size="icon" variant="ghost" className="rounded-full">
                    <Upload className="w-5 h-5" />
                </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-full"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 absolute w-full shadow-lg animate-accordion-down">
          <div className="px-4 pt-2 pb-6 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                    pathname === item.href
                      ? "bg-secondary text-primary"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
            {adminItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                    pathname === item.href
                      ? "bg-secondary text-primary"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}

            <div className="h-px bg-gray-100 my-2" />

            {user ? (
              <>
                <Link
                  href={`/profile/${userData?.username || user.id}`}
                  className="flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium text-gray-600 hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="w-5 h-5" />
                  <span>Profile</span>
                </Link>
                <button
                  onClick={() => {
                    handleLogout()
                    setMobileMenuOpen(false)
                  }}
                  className="flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium text-gray-600 hover:bg-gray-50 w-full text-left"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sign out</span>
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full"
                >
                  <Button variant="outline" className="w-full rounded-xl h-12 font-medium">
                    Sign in
                  </Button>
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full"
                >
                  <Button className="w-full rounded-xl h-12 font-medium shadow-sm">
                    Sign up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
