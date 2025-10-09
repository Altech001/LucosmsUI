import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contact Collection - Lucosms",
  description:
    "Manage your SMS contact groups and lists. Import contacts from Excel, CSV, or add them individually. Organize contacts for targeted messaging campaigns.",
  keywords:
    "contact management, SMS contacts, contact groups, import contacts, CSV import, Excel import, contact organization, Lucosms",
  openGraph: {
    title: "Contact Collection - Lucosms",
    description: "Manage your SMS contact groups and lists efficiently",
    type: "website",
  },
}

export default function ContactCollectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
