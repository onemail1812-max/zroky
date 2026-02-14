import type { ReactNode } from "react"
import { Instrument_Sans, JetBrains_Mono, Space_Grotesk } from "next/font/google"

const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-body" })
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" })
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" })

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <div className={`${body.variable} ${display.variable} ${mono.variable}`}>{children}</div>
}
