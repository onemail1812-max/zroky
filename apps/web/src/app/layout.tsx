import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import { QueryProvider } from "@/components/aaliyah/providers/QueryProvider"
import { ClerkAuthSync } from "@/components/auth/ClerkAuthSync"
import { Toaster } from "react-hot-toast"
import "./globals.css"

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://aaliyah.zroky.com'),
  title: {
    default: "Aaliyah Workspace",
    template: "%s | Aaliyah Workspace",
  },
  description: "Advanced AI Executive Assistant — streamline your inbox, calendar, and workflows with intelligent automation.",
  keywords: ["AI", "Executive Assistant", "Aaliyah", "Productivity", "Inbox Management", "Smart Calendar"],
  authors: [{ name: "Zroky Team" }],
  creator: "Zroky",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://aaliyah.zroky.com",
    title: "Aaliyah Workspace",
    description: "Advanced AI Executive Assistant — streamline your inbox, calendar, and workflows.",
    siteName: "Aaliyah Workspace",
    images: [{
      url: '/og-image.png',
      width: 1200,
      height: 630,
      alt: 'Aaliyah Workspace Dashboard'
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aaliyah Workspace",
    description: "Advanced AI Executive Assistant.",
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${plusJakartaSans.variable} font-sans antialiased`} suppressHydrationWarning>
          {/* Console suppression removed to allow debugging */}
          <Toaster position="top-right" />
          <ClerkAuthSync />
          <QueryProvider>{children}</QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
