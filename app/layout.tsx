import type { Metadata } from "next"
import { Space_Grotesk, DM_Sans } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { UploadProvider } from "@/lib/context/upload-context"
import { GlobalUploadIndicator } from "@/components/global-upload-indicator"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Life.Allstac - Community Photo Sharing",
  description: "Share your moments with the community",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${dmSans.variable}`}>
      <body className={dmSans.className}>
        <UploadProvider>
          {children}
          <GlobalUploadIndicator />
          <Toaster />
        </UploadProvider>
      </body>
    </html>
  )
}
