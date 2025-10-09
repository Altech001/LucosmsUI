"use client"
import { Breadcrumb } from "@/components/breadcrumb"
import { PageLayout } from "@/components/page-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Check, CreditCard, MessageSquare, Search, Store, Zap } from "lucide-react"
import { useState } from "react"

const categories = ["All Categories", "Messaging", "Payment", "Email", "Communication", "Analytics", "Integration"]

const services = [
  {
    id: "sender-ids",
    name: "Sender IDs",
    description: "Custom sender IDs for your SMS campaigns. Build trust with branded messaging.",
    icon: MessageSquare,
    category: "Messaging",
    price: "Free",
    features: ["Custom branding", "Multiple IDs", "Analytics dashboard"],
    status: "not available",
    badge: "Popular",
  },
  {
    id: "payment-api",
    name: "Payment API",
    description: "Integrate payment processing directly into your messaging platform.",
    icon: CreditCard,
    category: "Payment",
    price: "Free",
    features: ["Secure transactions", "Real-time processing", "Webhook support"],
    status: "available",
    badge: "New",
  },
  {
    id: "whatsapp-business",
    name: "WhatsApp Business API",
    description: "Connect with customers on WhatsApp with official business messaging.",
    icon: MessageSquare,
    category: "Messaging",
    price: "Free",
    features: ["Bulky whatsapp messages", "Templates", "24/7 support"],
    status: "not available",
    badge: "Enterprise",
  }
]

export default function MarketplacePage() {
  const [selectedCategory, setSelectedCategory] = useState("All Categories")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredServices = services.filter((service) => {
    const matchesCategory = selectedCategory === "All Categories" || service.category === selectedCategory
    const matchesSearch =
      searchQuery === "" ||
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <PageLayout>
      <div className="mx-auto max-w-7xl space-y-8">
        <Breadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Marketplace" }]} />
        <div className="space-y-6">
          <h1 className="text-balance text-2xl font-bold tracking-tight text-foreground">
            Extend your messaging platform
          </h1>
          <p className="max-w-2xl text-pretty text-sm text-muted-foreground">
            Discover and integrate powerful services to enhance your SMS platform capabilities.
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 shadow-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="text-xs shadow-none"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => {
            const Icon = service.icon
            return (
              <Card
                key={service.id}
                className="group relative overflow-hidden border-border/40 bg-card/50 backdrop-blur transition-all hover:border-border shadow-none hover:bg-card/80"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    {service.badge && (
                      <Badge
                        variant="secondary"
                        className={
                          service.badge === "Popular"
                            ? "bg-blue-500/10 text-blue-500"
                            : service.badge === "New"
                              ? "bg-green-500/10 text-green-500"
                              : "bg-purple-500/10 text-purple-500"
                        }
                      >
                        {service.badge}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl">{service.name}</CardTitle>
                  <CardDescription className="text-sm">{service.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-foreground">{service.price.split("/")[0]}</span>
                    <span className="text-sm text-muted-foreground">/{service.price.split("/")[1]}</span>
                  </div>

                  <ul className="space-y-2">
                    {service.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {service.status === "available" ? (
                    <Button className="w-full gap-2">
                      <Zap className="h-4 w-4" />
                      Install Service
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full bg-transparent" disabled>
                      Coming Soon
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredServices.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Store className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No services found</h3>
            <p className="mt-2 text-sm text-muted-foreground">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
