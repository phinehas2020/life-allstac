import { NavBar } from "@/components/nav-bar"
import { OnboardingModal } from "@/components/onboarding-modal"
import { PageTransition } from "@/components/page-transition"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <NavBar />
      <OnboardingModal />
      <main className="min-h-screen bg-gray-50">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
    </>
  )
}
