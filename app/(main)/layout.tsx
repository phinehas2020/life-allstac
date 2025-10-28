import { NavBar } from "@/components/nav-bar"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-gray-50">
        {children}
      </main>
    </>
  )
}
