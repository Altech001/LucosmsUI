import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Schedule Messages - Lucosms",
  description:
    "Schedule SMS messages for future delivery. Plan campaigns, automate reminders, and manage your scheduled messages efficiently.",
  keywords: "schedule SMS, automated messages, SMS scheduling, campaign planning, message automation, Lucosms",
  openGraph: {
    title: "Schedule Messages - Lucosms",
    description: "Plan and automate your SMS campaigns",
    type: "website",
  },
}

export default function ScheduleMessagesLayout({ children }: { children: React.ReactNode }) {
  return children
}
