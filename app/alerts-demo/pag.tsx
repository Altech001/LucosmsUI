"use client"

import * as React from "react"
import { Breadcrumb } from "@/components/breadcrumb"
import { PageLayout } from "@/components/page-layout"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit,
  FileSpreadsheet,
  FolderOpen,
  GripVertical,
  Mail,
  MessageSquare,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Send,
  Tag,
  Trash2,
  Upload,
  UserPlus,
  Loader2,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useToast } from "@/contexts/toast-context"

// Types
interface Message {
  id: number
  user_id: string
  recipient: string
  message: string
  status: string
  cost: number
  sender_id: string
  created_at: string
}

interface Summary {
  wallet: {
    current_balance: number
    total_topups: number
    total_spent: number
  }
  messages: {
    total_sent: number
    pending: number
    delivered: number
    failed: number
  }
  account: {
    username: string
    email: string
    created_at: string
  }
}

interface SpendingReport {
  period: {
    start_date: string | null
    end_date: string | null
  }
  summary: {
    total_messages: number
    total_spent: number
    average_cost_per_message: number
  }
  status_breakdown: Record<string, number>
}

type DashboardComponent = {
  id: string
  title: string
  type: "stats" | "charts" | "activity" | "wallet"
  order: number
}

// API Configuration
const API_BASE_URL = "https://luco-backend.onrender.com/api/v1"

// API Functions
const dashboardAPI = {
  getMessages: async (params?: { skip?: number; limit?: number }): Promise<Message[]> => {
    const queryParams = new URLSearchParams()
    queryParams.append("skip", (params?.skip || 0).toString())
    queryParams.append("limit", (params?.limit || 100).toString())

    const response = await fetch(`${API_BASE_URL}/account/reports/messages?${queryParams.toString()}`)
    if (!response.ok) throw new Error("Failed to fetch messages")
    return response.json()
  },

  getSummary: async (): Promise<Summary> => {
    const response = await fetch(`${API_BASE_URL}/account/reports/summary`)
    if (!response.ok) throw new Error("Failed to fetch summary")
    return response.json()
  },

  getSpending: async (): Promise<SpendingReport> => {
    const response = await fetch(`${API_BASE_URL}/account/reports/spending`)
    if (!response.ok) throw new Error("Failed to fetch spending report")
    return response.json()
  },
}

// Utility functions
const getStatusIcon = (status: string) => {
  const normalizedStatus = status.toLowerCase()
  switch (normalizedStatus) {
    case "success":
    case "delivered":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />
    case "pending":
      return <Clock className="h-4 w-4 text-amber-500" />
    default:
      return null
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const formatCurrency = (amount: number) => {
  return `UGX ${amount.toLocaleString()}`
}

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  if (percent < 0.05) return null // Don't show label if less than 5%

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      className="font-semibold text-sm"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function Home() {
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = React.useState(true)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [summary, setSummary] = React.useState<Summary | null>(null)
  const [spending, setSpending] = React.useState<SpendingReport | null>(null)
  const [components, setComponents] = React.useState<DashboardComponent[]>([
    { id: "stats", title: "Message Statistics", type: "stats", order: 0 },
    { id: "wallet", title: "Wallet Overview", type: "wallet", order: 1 },
    { id: "charts", title: "Analytics", type: "charts", order: 2 },
    { id: "activity", title: "Recent Activity", type: "activity", order: 3 },
  ])
  const [draggedItem, setDraggedItem] = React.useState<string | null>(null)

  // Fetch dashboard data with retry mechanism
  const fetchData = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        setIsLoading(true)
        const [messagesData, summaryData, spendingData] = await Promise.all([
          dashboardAPI.getMessages({ limit: 100 }),
          dashboardAPI.getSummary(),
          dashboardAPI.getSpending(),
        ])
        console.log("Messages:", messagesData)
        console.log("Summary:", summaryData)
        console.log("Spending:", spendingData)

        if (messagesData && summaryData && spendingData) {
          setMessages(messagesData)
          setSummary(summaryData)
          setSpending(spendingData)
          showToast("Dashboard Loaded", "All data synchronized successfully", "success")
          break
        } else {
          throw new Error("Invalid data received from API")
        }
      } catch (error) {
        if (i === retries - 1) {
          console.error("Fetch error after retries:", error)
          showToast("Error", error instanceof Error ? error.message : "Failed to load dashboard", "error")
        }
      } finally {
        setIsLoading(false)
      }
    }
  }

  React.useEffect(() => {
    fetchData()
  }, [])

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItem(id)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedItem || draggedItem === targetId) return

    const newComponents = [...components]
    const draggedIndex = newComponents.findIndex((c) => c.id === draggedItem)
    const targetIndex = newComponents.findIndex((c) => c.id === targetId)

    const [removed] = newComponents.splice(draggedIndex, 1)
    newComponents.splice(targetIndex, 0, removed)

    newComponents.forEach((c, i) => (c.order = i))
    setComponents(newComponents)
    setDraggedItem(null)
    showToast("Layout Updated", "Dashboard sections reordered", "info")
  }

  // Prepare chart data with proper fallbacks
  const messageStatusData = React.useMemo(() => {
    if (!summary) return []
    
    const data = [
      { name: "Delivered", value: summary.messages.delivered, color: "#10b981" },
      { name: "Pending", value: summary.messages.pending, color: "#f59e0b" },
      { name: "Failed", value: summary.messages.failed, color: "#ef4444" },
    ]

    return data.filter(item => item.value > 0)
  }, [summary])

  // Group messages by day for weekly overview
  const weeklyData = React.useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const groupedByDay: Record<string, { sent: number; delivered: number; failed: number }> = {}

    messages.forEach((msg) => {
      const date = new Date(msg.created_at)
      const dayName = days[date.getDay()]

      if (!groupedByDay[dayName]) {
        groupedByDay[dayName] = { sent: 0, delivered: 0, failed: 0 }
      }

      groupedByDay[dayName].sent++
      if (msg.status.toLowerCase() === "delivered" || msg.status.toLowerCase() === "success") {
        groupedByDay[dayName].delivered++
      } else if (msg.status.toLowerCase() === "failed") {
        groupedByDay[dayName].failed++
      }
    })

    return days.map((day) => ({
      day,
      sent: groupedByDay[day]?.sent || 0,
      delivered: groupedByDay[day]?.delivered || 0,
      failed: groupedByDay[day]?.failed || 0,
    }))
  }, [messages])

  // Group messages by hour for timeline
  const timelineData = React.useMemo(() => {
    const hours = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"]
    const groupedByHour: Record<string, number> = {}

    messages.forEach((msg) => {
      const date = new Date(msg.created_at)
      const hour = Math.floor(date.getHours() / 4) * 4
      const timeKey = `${hour.toString().padStart(2, "0")}:00`

      groupedByHour[timeKey] = (groupedByHour[timeKey] || 0) + 1
    })

    return hours.map((time) => ({
      time,
      messages: groupedByHour[time] || 0,
    }))
  }, [messages])

  const renderComponent = (component: DashboardComponent) => {
    switch (component.type) {
      case "stats":
        return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="p-6 border-border/40 shadow-none bg-card/50 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Messages Sent</p>
                  <p className="mt-2 text-3xl font-bold">{summary?.messages.total_sent.toLocaleString() || 0}</p>
                  <div className="mt-2 flex items-center gap-1 text-sm">
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                    <span className="font-medium text-emerald-500">
                      {summary && summary.messages.total_sent > 0
                        ? ((summary.messages.delivered / summary.messages.total_sent) * 100).toFixed(1)
                        : 0}%
                    </span>
                    <span className="text-muted-foreground">delivered</span>
                  </div>
                </div>
                <div className="rounded-full bg-blue-500/10 p-3">
                  <MessageSquare className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border/40 shadow-none bg-card/50 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Delivered</p>
                  <p className="mt-2 text-3xl font-bold">{summary?.messages.delivered.toLocaleString() || 0}</p>
                  <div className="mt-2 flex items-center gap-1 text-sm">
                    <span className="font-medium text-emerald-500">
                      {summary && summary.messages.total_sent > 0
                        ? ((summary.messages.delivered / summary.messages.total_sent) * 100).toFixed(1)
                        : 0}%
                    </span>
                    <span className="text-muted-foreground">success rate</span>
                  </div>
                </div>
                <div className="rounded-full bg-emerald-500/10 p-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border/40 shadow-none bg-card/50 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="mt-2 text-3xl font-bold">{summary?.messages.pending.toLocaleString() || 0}</p>
                  <div className="mt-2 flex items-center gap-1 text-sm">
                    <span className="font-medium text-amber-500">
                      {summary && summary.messages.total_sent > 0
                        ? ((summary.messages.pending / summary.messages.total_sent) * 100).toFixed(1)
                        : 0}%
                    </span>
                    <span className="text-muted-foreground">in queue</span>
                  </div>
                </div>
                <div className="rounded-full bg-amber-500/10 p-3">
                  <Clock className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-none border-amber-600 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Failed</p>
                  <p className="mt-2 text-3xl font-bold">{summary?.messages.failed.toLocaleString() || 0}</p>
                  <div className="mt-2 flex items-center gap-1 text-sm">
                    <span className="font-medium text-red-500">
                      {summary && summary.messages.total_sent > 0
                        ? ((summary.messages.failed / summary.messages.total_sent) * 100).toFixed(1)
                        : 0}%
                    </span>
                    <span className="text-muted-foreground">error rate</span>
                  </div>
                </div>
                <div className="rounded-full bg-red-500/10 p-3">
                  <XCircle className="h-6 w-6 text-red-500" />
                </div>
              </div>
            </Card>
          </div>
        )

      case "wallet":
        return (
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-6  shadow-none border-amber-600 backdrop-blur">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Current Balance</p>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-3xl font-bold">{formatCurrency(summary?.wallet.current_balance || 0)}</p>
                <p className="text-xs text-muted-foreground">
                  ≈ {Math.floor((summary?.wallet.current_balance || 0) / 32)} messages remaining
                </p>
              </div>
            </Card>

            <Card className="p-6 bg-card/50 backdrop-blur shadow-none border-amber-600">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
                <p className="text-3xl font-bold">{formatCurrency(spending?.summary.total_spent || 0)}</p>
                <p className="text-xs text-muted-foreground">
                  {spending?.summary.total_messages || 0} messages sent
                </p>
              </div>
            </Card>

            <Card className="p-6 shadow-none border-blue-600 backdrop-blur">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Avg Cost Per Message</p>
                <p className="text-3xl font-bold">{formatCurrency(spending?.summary.average_cost_per_message || 0)}</p>
                <p className="text-xs text-muted-foreground">per SMS delivered</p>
              </div>
            </Card>
          </div>
        )

      case "charts":
        return (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Enhanced Pie Chart - Message Status Distribution */}
              <Card className="p-6 border-border/40 bg-card/50 backdrop-blur shadow-none">
                <div className="mb-6">
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <Send className="h-5 w-5" />
                    Message Status Distribution
                  </h3>
                  <p className="text-sm text-muted-foreground">Breakdown of delivery status</p>
                </div>
                {messageStatusData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={messageStatusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={renderCustomLabel}
                          outerRadius={110}
                          innerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                          strokeWidth={2}
                          stroke="hsl(var(--background))"
                        >
                          {messageStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [value.toLocaleString(), "Messages"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-6 grid grid-cols-3 gap-4">
                      {messageStatusData.map((item) => {
                        const total = messageStatusData.reduce((acc, i) => acc + i.value, 0)
                        const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0
                        return (
                          <div key={item.name} className="flex items-center gap-2">
                            <div
                              className="h-4 w-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: item.color }}
                            ></div>
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground truncate">{item.name}</p>
                              <p className="text-sm font-semibold">{item.value.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">{percentage}%</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No message data available</p>
                    </div>
                  </div>
                )}
              </Card>

              {/* Line Chart - Messages Over Time */}
              <Card className="p-6 border-border/40 bg-card/50 backdrop-blur">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold">Messages Over Time</h3>
                  <p className="text-sm text-muted-foreground">24-hour message activity</p>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="messages"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{ fill: "#8b5cf6", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Bar Chart - Weekly Overview */}
            <Card className="p-6 border-border/40 bg-card/50 backdrop-blur shadow-none">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Weekly Message Overview</h3>
                  <p className="text-sm text-muted-foreground">Daily breakdown of message status</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href="/history">View All History</a>
                </Button>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="sent" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Sent" />
                  <Bar dataKey="delivered" fill="#10b981" radius={[4, 4, 0, 0]} name="Delivered" />
                  <Bar dataKey="failed" fill="#ef4444" radius={[4, 4, 0, 0]} name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )

      case "activity":
        return (
          <Card className="p-6 border-border/40 bg-card/50 backdrop-blur shadow-none">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Recent Messages</h3>
                <p className="text-sm text-muted-foreground">Latest SMS activity</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="/history">View All</a>
              </Button>
            </div>
            {messages.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No recent messages</p>
                  <p className="text-sm">Send your first message to see activity here</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.slice(0, 5).map((msg) => (
                  <div
                    key={msg.id}
                    className="flex items-start gap-3 rounded-lg border border-border/40 p-4 bg-background/50 hover:bg-background/80 transition-colors"
                  >
                    <div className="mt-0.5">{getStatusIcon(msg.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold truncate">{msg.recipient}</p>
                        <Badge variant="outline" className="text-xs">
                          {msg.sender_id}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mb-2">{msg.message}</p>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize ${
                            msg.status.toLowerCase() === "delivered" || msg.status.toLowerCase() === "success"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : msg.status.toLowerCase() === "failed"
                                ? "bg-red-500/10 text-red-500 border-red-500/20"
                                : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          }`}
                        >
                          {msg.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-medium">{formatCurrency(msg.cost)}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(msg.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )

      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <PageLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-8 w-48 animate-pulse rounded bg-muted"></div>
            <div className="h-10 w-32 animate-pulse rounded bg-muted"></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-lg bg-muted"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-96 animate-pulse rounded-lg bg-muted"></div>
            ))}
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <Breadcrumb items={[{ label: "Dashboard", href: "/" }]} />
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, {summary?.account.username || "User"}! Monitor your messaging activity.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="gap-2 p-2 rounded">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
              </span>
              API Online
            </Badge>
            <Badge variant="outline" className="gap-2 p-2 rounded">
              Database Active
            </Badge>
          </div>
        </div>

        <div className="space-y-6">
          {components
            .sort((a, b) => a.order - b.order)
            .map((component) => (
              <div
                key={component.id}
                draggable
                onDragStart={(e) => handleDragStart(e, component.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, component.id)}
                className="group relative cursor-move"
              >
                <div className="absolute -left-8 top-4 opacity-0 transition-opacity group-hover:opacity-100">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>
                {renderComponent(component)}
              </div>
            ))}
        </div>

        <Card className="p-6 border-border/50  backdrop-blur shadow-none">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Ready to send a message?</h3>
              <p className="text-sm text-muted-foreground">Compose and send SMS to your contacts instantly</p>
            </div>
            <Button size="lg" asChild>
              <a href="/compose">
                <Send className="mr-2 h-4 w-4" />
                Compose Message
              </a>
            </Button>
          </div>
        </Card>
      </div>
    </PageLayout>
  )
}