import { PageLayout } from "@/components/page-layout"
import { AlertDemo } from "@/components/alert-demo"
import { Breadcrumb } from "@/components/breadcrumb"

export const metadata = {
  title: "Alerts Demo - Lucosms",
  description: "Clean and beautiful alert components for notifications and messages",
}

export default function AlertsDemoPage() {
  return (
    <PageLayout>
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/" },
            { label: "Alerts Demo", href: "/alerts-demo" },
          ]}
        />

        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alert Components</h1>
          <p className="mt-2 text-muted-foreground">
            Clean and beautiful alerts for success, info, warning, and error messages.
          </p>
        </div>

        <AlertDemo />
      </div>
    </PageLayout>
  )
}
