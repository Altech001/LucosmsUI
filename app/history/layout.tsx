import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Message History - Lucosms",
  description:
    "View and track all your sent SMS messages. Monitor delivery status, analyze campaign performance, and access detailed message logs.",
  keywords: "message history, SMS tracking, delivery status, message logs, campaign analytics, Lucosms",
  openGraph: {
    title: "Message History - Lucosms",
    description: "Track and analyze your SMS message history",
    type: "website",
  },
}

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return children
}
