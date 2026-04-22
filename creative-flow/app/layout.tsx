import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Manrope } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
})

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "CreativeFlow — Voice-Powered Goal Planner",
  description: "Speak your goals. Get a structured action plan, delivered by voice.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
}

export const viewport: Viewport = {
  themeColor: "#0f0f11",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} ${manrope.variable} h-full`}
      >
        <body className="h-full">
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
