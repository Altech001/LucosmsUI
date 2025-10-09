"use client"

import * as React from "react"
import { PageLayout } from "@/components/page-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, Clock, Users, FileText, X, Loader2, Zap, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Breadcrumb } from "@/components/breadcrumb"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/contexts/toast-context"
import { Input } from "@/components/ui/input"

// Types
interface Group {
  id: number
  user_id: string
  name: string
  description: string
  created_at: string
  updated_at: string
  contact_count?: number
}

interface SendSMSRequest {
  message: string
  recipient: string[]
  sender_id: string
}

interface SendBulkSMSRequest {
  message: string
  group_ids: number[]
  sender_id: string
}

interface SMSMessage {
  id: number
  user_id: string
  recipient: string
  message: string
  status: string
  cost: number
  sender_id: string
  created_at: string
}

interface SendSMSResponse {
  total_sent: number
  total_cost: number
  messages: SMSMessage[]
}

interface WalletData {
  id: string
  username: string
  email: string
  wallet_balance: number
  clerk_user_id: string
  created_at: string
}

// API Configuration
const API_BASE_URL = "https://luco-backend.onrender.com/api/v1"

// API Functions
const smsAPI = {
  sendSMS: async (data: SendSMSRequest): Promise<SendSMSResponse> => {
    const response = await fetch(`${API_BASE_URL}/account/sms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || "Failed to send SMS")
    }
    return response.json()
  },

  sendBulkSMS: async (data: SendBulkSMSRequest): Promise<SendSMSResponse> => {
    const response = await fetch(`${API_BASE_URL}/account/sms/send-bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || "Failed to send bulk SMS")
    }
    return response.json()
  },

  getGroups: async (): Promise<Group[]> => {
    const response = await fetch(`${API_BASE_URL}/groups/?skip=0&limit=100`, {
      headers: { accept: "application/json" },
    })
    if (!response.ok) {
      throw new Error("Failed to fetch groups")
    }
    const data: Group[] = await response.json()
    
    const groupsWithDetails = await Promise.all(
      data.map(async (group: Group): Promise<Group> => {
        try {
          const detailResponse = await fetch(`${API_BASE_URL}/groups/${group.id}`)
          if (detailResponse.ok) {
            const details: Group & { contact_count: number } = await detailResponse.json()
            return { ...group, contact_count: details.contact_count || 0 }
          }
          return { ...group, contact_count: 0 }
        } catch {
          return { ...group, contact_count: 0 }
        }
      })
    )
    return groupsWithDetails
  },

  getWallet: async (): Promise<WalletData> => {
    const response = await fetch(`${API_BASE_URL}/account/wallet`, {
      headers: { accept: "application/json" },
    })
    if (!response.ok) {
      throw new Error("Failed to fetch wallet data")
    }
    return response.json()
  },
}

export default function ComposePage() {
  const { showToast } = useToast()
  const [message, setMessage] = React.useState("")
  const [senderId, setSenderId] = React.useState("ATUpdates")
  const [recipientType, setRecipientType] = React.useState<"single" | "group">("group")
  const [singleRecipient, setSingleRecipient] = React.useState("")
  const [selectedGroups, setSelectedGroups] = React.useState<number[]>([])
  const [groups, setGroups] = React.useState<Group[]>([])
  const [walletData, setWalletData] = React.useState<WalletData | null>(null)
  const [isSending, setIsSending] = React.useState(false)
  const [isLoadingGroups, setIsLoadingGroups] = React.useState(true)
  const [isLoadingWallet, setIsLoadingWallet] = React.useState(true)

  const messageLength = message.length
  const smsSegments = Math.ceil(messageLength / 160) || 1
  
  const totalRecipients = recipientType === "single" 
    ? (singleRecipient ? 1 : 0)
    : selectedGroups.reduce((acc, groupId) => {
        const group = groups.find((g) => g.id === groupId)
        return acc + (group?.contact_count || 0)
      }, 0)
  
  const estimatedCost = totalRecipients * smsSegments * 32

  // Fetch groups
  const fetchGroups = React.useCallback(async () => {
    try {
      setIsLoadingGroups(true)
      const data = await smsAPI.getGroups()
      setGroups(data)
    } catch (error) {
      showToast("Error", error instanceof Error ? error.message : "Failed to fetch groups", "error")
    } finally {
      setIsLoadingGroups(false)
    }
  }, [showToast])

  // Fetch wallet
  const fetchWallet = React.useCallback(async () => {
    try {
      setIsLoadingWallet(true)
      const data = await smsAPI.getWallet()
      setWalletData(data)
    } catch (error) {
      showToast("Error", error instanceof Error ? error.message : "Failed to fetch wallet", "error")
    } finally {
      setIsLoadingWallet(false)
    }
  }, [showToast])

  React.useEffect(() => {
    fetchGroups()
    fetchWallet()
  }, [fetchGroups, fetchWallet])

  const handleGroupToggle = (groupId: number) => {
    setSelectedGroups((prev) => (prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]))
  }

  const handleSend = async () => {
    // Validation
    if (!message.trim()) {
      showToast("Validation Error", "Please enter a message", "warning")
      return
    }

    if (!senderId.trim()) {
      showToast("Validation Error", "Please enter a sender ID", "warning")
      return
    }

    if (recipientType === "single") {
      if (!singleRecipient.trim()) {
        showToast("Validation Error", "Please enter a recipient phone number", "warning")
        return
      }
    } else {
      if (selectedGroups.length === 0) {
        showToast("Validation Error", "Please select at least one group", "warning")
        return
      }
    }

    // Check wallet balance
    if (walletData && walletData.wallet_balance < estimatedCost) {
      showToast(
        "Insufficient Balance",
        `You need UGX ${estimatedCost.toLocaleString()} but only have UGX ${walletData.wallet_balance.toLocaleString()}. Please top up your wallet.`,
        "error"
      )
      return
    }

    setIsSending(true)
    try {
      let response: SendSMSResponse

      if (recipientType === "single") {
        response = await smsAPI.sendSMS({
          message: message.trim(),
          recipient: [singleRecipient.trim()],
          sender_id: senderId.trim(),
        })
      } else {
        response = await smsAPI.sendBulkSMS({
          message: message.trim(),
          group_ids: selectedGroups,
          sender_id: senderId.trim(),
        })
      }

      showToast(
        "Success!",
        `Successfully sent ${response.total_sent} message(s). Total cost: UGX ${response.total_cost.toLocaleString()}`,
        "success"
      )

      // Reset form
      setMessage("")
      setSingleRecipient("")
      setSelectedGroups([])
      
      // Refresh wallet
      fetchWallet()
    } catch (error) {
      showToast("Error", error instanceof Error ? error.message : "Failed to send message", "error")
    } finally {
      setIsSending(false)
    }
  }

  const hasInsufficientBalance = walletData && walletData.wallet_balance < estimatedCost

  return (
    <PageLayout>
      <div className="mx-auto max-w-7xl space-y-6 py-8">
        <Breadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Compose Message" }]} />

        <div>
          <h1 className="text-xl font-bold tracking-tight">Compose Message</h1>
          <p className="mt-2 text-sm text-muted-foreground">Create and send SMS messages to your contacts</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Compose Area */}
          <div className="space-y-6 lg:col-span-2">
            <Card className="border-border/50 bg-card/50 backdrop-blur shadow-none">
              <CardHeader>
                <CardTitle className="text-lg">Sender Configuration</CardTitle>
                <CardDescription>Configure your sender ID and recipient type</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="senderId">Sender ID</Label>
                  <Input
                    id="senderId"
                    placeholder="ATUpdates"
                    value={senderId}
                    disabled
                    onChange={(e) => setSenderId(e.target.value)}
                    className="bg-background/50  font-bold"
                  />
                  <p className="text-xs text-muted-foreground">This will appear as the sender name</p>
                </div>

                <div className="space-y-2">
                  <Label>Recipient Type</Label>
                  <div className="flex gap-3">
                    <Button
                      variant={recipientType === "single" ? "default" : "outline"}
                      className={cn("flex-1", recipientType !== "single" && "bg-transparent")}
                      onClick={() => {
                        setRecipientType("single")
                        setSelectedGroups([])
                      }}
                    >
                      Single Contact
                    </Button>
                    <Button
                      variant={recipientType === "group" ? "default" : "outline"}
                      className={cn("flex-1", recipientType !== "group" && "bg-transparent")}
                      onClick={() => {
                        setRecipientType("group")
                        setSingleRecipient("")
                      }}
                    >
                      Group(s)
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {recipientType === "single" ? (
              <Card className="border-border/50 bg-card/50 backdrop-blur shadow-none">
                <CardHeader>
                  <CardTitle className="text-lg">Recipient</CardTitle>
                  <CardDescription>Enter the phone number to send to</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Label htmlFor="recipient">Phone Number</Label>
                  <Input
                    id="recipient"
                    placeholder="+256708315306"
                    value={singleRecipient}
                    onChange={(e) => setSingleRecipient(e.target.value)}
                    className="bg-background/50"
                  />
                  <p className="text-xs text-muted-foreground">Include country code (e.g., +256)</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/50 bg-card/50 backdrop-blur shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5" />
                    Select Groups
                  </CardTitle>
                  <CardDescription>Choose contact groups to send your message to</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingGroups ? (
                    <div className="space-y-3">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : groups.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No groups found. Create a group first.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {groups.map((group) => (
                        <div
                          key={group.id}
                          className={cn(
                            "flex items-center justify-between rounded-lg border p-4 transition-all cursor-pointer",
                            selectedGroups.includes(group.id)
                              ? "border-primary bg-primary/5"
                              : "border-border/50 bg-background/50 hover:bg-background/80"
                          )}
                          onClick={() => handleGroupToggle(group.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={`group-${group.id}`}
                              checked={selectedGroups.includes(group.id)}
                              onCheckedChange={() => handleGroupToggle(group.id)}
                            />
                            <div>
                              <Label htmlFor={`group-${group.id}`} className="cursor-pointer font-medium">
                                {group.name}
                              </Label>
                              {group.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">{group.description}</p>
                              )}
                            </div>
                          </div>
                          <Badge variant="secondary" className="font-mono">
                            {group.contact_count || 0} contacts
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedGroups.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      <p className="text-xs text-muted-foreground w-full mb-1">Selected groups:</p>
                      {selectedGroups.map((groupId) => {
                        const group = groups.find((g) => g.id === groupId)
                        return (
                          <Badge key={groupId} variant="default" className="gap-1">
                            {group?.name}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleGroupToggle(groupId)
                              }}
                              className="ml-1 rounded-full hover:bg-primary-foreground/20"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="border-border/50 bg-card/50 backdrop-blur shadow-none">
              <CardHeader>
                <CardTitle className="text-lg">Message Content</CardTitle>
                <CardDescription>Write your SMS message</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Type your message here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[200px] resize-none border-border/40 bg-background/50 text-sm"
                  />
                  <div className="flex items-center justify-between text-sm">
                    <span className={cn("text-muted-foreground", messageLength > 160 && "text-orange-500")}>
                      {messageLength} characters
                    </span>
                    <span className="text-muted-foreground">{smsSegments} SMS segment(s)</span>
                  </div>
                </div>

                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                  <p className="text-xs text-muted-foreground">
                    <strong>Tip:</strong> Keep messages under 160 characters for single SMS. Longer messages will be split into multiple segments.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Wallet Balance */}
            <Card className="border-border/50 bg-card/50 backdrop-blur shadow-none">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingWallet ? (
                  <Skeleton className="h-16 w-full" />
                ) : walletData ? (
                  <div className="space-y-2">
                    <div className="text-3xl font-bold">UGX {walletData.wallet_balance.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      ≈ {Math.floor(walletData.wallet_balance / 32)} messages
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Unable to load balance</p>
                )}
              </CardContent>
            </Card>

            {/* Preview */}
            <Card className="border-border/50 bg-card/50 backdrop-blur shadow-none">
              <CardHeader>
                <CardTitle className="text-lg">Preview</CardTitle>
                <CardDescription>How your message will appear</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-primary text-sm font-bold text-primary-foreground">
                      {senderId.charAt(0).toUpperCase() || "L"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{senderId || "Sender"}</p>
                      <p className="text-xs text-muted-foreground">SMS Message</p>
                    </div>
                  </div>
                  <div className="rounded bg-primary/10 p-4">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message || "Your message will appear here. Start typing to see a preview."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}

            
            <Card className="border-border/50 bg-card/50 backdrop-blur shadow-none">
              <CardHeader>
                <CardTitle className="text-lg">Summary</CardTitle>
                <CardDescription>Campaign overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Recipient Type</span>
                    <span className="font-semibold capitalize">{recipientType}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Recipients</span>
                    <span className="font-semibold">{totalRecipients.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">SMS Segments</span>
                    <span className="font-semibold">{smsSegments}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Messages</span>
                    <span className="font-semibold">{(totalRecipients * smsSegments).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border/50 pt-3 text-sm">
                    <span className="text-muted-foreground">Estimated Cost</span>
                    <span className={cn("text-lg font-bold", hasInsufficientBalance && "text-red-500")}>
                      UGX {estimatedCost.toLocaleString()}
                    </span>
                  </div>
                </div>

                {hasInsufficientBalance && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Insufficient balance. Please top up your wallet to continue.
                    </p>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <Button
                    size="lg"
                    className="w-full gap-2"
                    disabled={
                      !message ||
                      (recipientType === "single" ? !singleRecipient : selectedGroups.length === 0) ||
                      isSending ||
                      hasInsufficientBalance
                    }
                    onClick={handleSend}
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        Send Now
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}