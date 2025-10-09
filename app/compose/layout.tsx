import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Compose Message - Lucosms",
  description:
    "Create and send SMS messages and campaigns. Select contacts, use templates, schedule delivery, and track your messaging costs.",
  keywords: "compose SMS, send message, SMS campaign, message templates, bulk SMS, schedule SMS, Lucosms",
  openGraph: {
    title: "Compose Message - Lucosms",
    description: "Create and send SMS messages to your contacts",
    type: "website",
  },
}

export default function ComposeLayout({ children }: { children: React.ReactNode }) {
  return children
}
