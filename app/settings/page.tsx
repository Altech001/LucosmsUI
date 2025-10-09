"use client"
import { Breadcrumb } from "@/components/breadcrumb"
import { PageLayout } from "@/components/page-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bell, Code, DeleteIcon, Edit, Lock, Package, Plus, Ticket, Trash2 } from "lucide-react"
import { useState } from "react"

const mockServices = [
  {
    id: "1",
    name: "ATUpdates",
    type: "Sender ID",
    amount: "$Free",
    status: "active",
    createdAt: "2024-01-15",
  }
]

const mockPromoCodes = [
  {
    id: "1",
    code: "BITSNEWS50",
    discount: "30%",
    type: "Percentage",
    status: "active",
    expiresAt: "2025-12-31",
    usedAt: "2024-01-15",
  }
]

export default function SettingsPage() {
  const [services] = useState(mockServices)
  const [promoCodes] = useState(mockPromoCodes)
  const [promoInput, setPromoInput] = useState("")

  return (
    <PageLayout>
      <div className="mx-auto max-w-6xl space-y-8">
        <Breadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Settings" }]} />
        <div className="space-y-4">
          <h1 className="text-balance text-xl font-bold tracking-tight text-foreground">Manage your preferences</h1>
          <p className="max-w-2xl text-pretty text-sm text-muted-foreground">
            Configure your application settings and customize your experience.
          </p>
        </div>

        <Tabs defaultValue="notifications" className="space-y-6 shadow-none">
          <TabsList className="grid w-full max-w-4xl grid-cols-5 bg-card/50 shadow-none">
            <TabsTrigger value="notifications" className="gap-2 shadow-none">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-2">
              <Package className="h-4 w-4" />
              Services
            </TabsTrigger>
            <TabsTrigger value="promo" className="gap-2">
              <Ticket className="h-4 w-4" />
              Promo Codes
            </TabsTrigger>
            <TabsTrigger value="privacy" className="gap-2">
              <Lock className="h-4 w-4" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="developer" className="gap-2">
              <Code className="h-4 w-4" />
              Developer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="space-y-6">
            <Card className="border-border/40 bg-card/50 backdrop-blur shadow-none">
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Configure how you receive notifications.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive push notifications in your browser</p>
                  </div>
                  <Switch />
                </div>

                
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            <Card className="border-border/40 bg-card/50 backdrop-blur shadow-none">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Manage Services</CardTitle>
                    <CardDescription>View and manage your active services and sender IDs.</CardDescription>
                  </div>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Service
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center justify-between rounded-lg border border-border/40 bg-card/30 p-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground">{service.name}</h4>
                          <Badge
                            variant="secondary"
                            className={
                              service.status === "active"
                                ? "bg-green-500/10 text-green-500"
                                : "bg-gray-500/10 text-gray-500"
                            }
                          >
                            {service.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{service.type}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Amount: {service.amount}</span>
                          <span>•</span>
                          <span>Created: {service.createdAt}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" disabled size="sm" className="gap-2 bg-transparent">
                          <Edit className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-destructive hover:text-destructive bg-transparent"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Add New Sender ID</CardTitle>
                <CardDescription>Register a new sender ID for your SMS campaigns.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sender-id">Sender ID</Label>
                    <Input id="sender-id" placeholder="e.g., MYCOMPANY" maxLength={11} />
                    <p className="text-xs text-muted-foreground">Maximum 11 characters, alphanumeric only</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Monthly Amount</Label>
                    <Input id="amount" type="text" placeholder="250000" />
                  </div>
                </div>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Register Sender ID
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="promo" className="space-y-6">
            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Redeem Promo Code</CardTitle>
                <CardDescription>Enter a promo code to receive discounts or credits.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter promo code"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    className="font-mono uppercase"
                  />
                  <Button className="gap-2">
                    <Ticket className="h-4 w-4" />
                    Apply Code
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Promo codes are case-insensitive and can be used once per account.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Active Promo Codes</CardTitle>
                <CardDescription>View and manage your redeemed promo codes.</CardDescription>
              </CardHeader>
              <CardContent>
                {promoCodes.length > 0 ? (
                  <div className="space-y-4">
                    {promoCodes.map((promo) => (
                      <div
                        key={promo.id}
                        className="flex items-center justify-between rounded-lg border border-border/40 bg-card/30 p-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-mono text-lg font-semibold text-foreground">{promo.code}</h4>
                            <Badge
                              variant="secondary"
                              className={
                                promo.status === "active"
                                  ? "bg-green-500/10 text-green-500"
                                  : "bg-gray-500/10 text-gray-500"
                              }
                            >
                              {promo.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{promo.type}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="font-semibold text-primary">Discount: {promo.discount}</span>
                            <span>•</span>
                            <span>Expires: {promo.expiresAt}</span>
                            <span>•</span>
                            <span>Used: {promo.usedAt}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-destructive hover:text-destructive bg-transparent"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Ticket className="mb-4 h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mb-2 text-lg font-semibold text-foreground">No promo codes yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Enter a promo code above to start saving on your SMS campaigns.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-primary/40 bg-primary/5 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-primary">Available Promo Coupons</CardTitle>
                <CardDescription>Check out current promotions and special offers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-foreground">NEW USER CREDIT</h4>
                      <p className="text-sm text-muted-foreground">Get UGx500 on your first top-up</p>
                      <p className="font-mono text-xs font-semibold text-primary">Code: WELCOME50</p>
                    </div>
                    <Badge variant="secondary" className="bg-primary/20 text-primary">
                      10% OFF
                    </Badge>
                  </div>
                </div>
                
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Privacy</CardTitle>
                <CardDescription>Control your privacy settings.</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-destructive/40 bg-destructive/5 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Irreversible actions for your account.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive">
                  <DeleteIcon/>
                  Delete Your Account
                  </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="developer" className="space-y-6">
            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Developer Settings</CardTitle>
                <CardDescription>Manage API keys and developer tools.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Access your API keys and configure developer settings to integrate Lucosms with your applications.
                </p>
                <Button className="gap-2">
                  <Code className="h-4 w-4" />
                  Manage API Keys
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  )
}
