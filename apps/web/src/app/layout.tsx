import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import { QueryProvider } from "@/components/aaliyah/providers/QueryProvider"
import { Toaster } from "react-hot-toast"
import "./globals.css"

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "Aaliyah Workspace",
  description: "Advanced AI Executive Assistant",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${plusJakartaSans.variable} font-sans antialiased`}>
        {process.env.NODE_ENV === 'production' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
              console.log = function() {};
              console.warn = function() {};
              console.error = function() {};
              `,
            }}
          />
        )}
        <Toaster position="top-right" />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
