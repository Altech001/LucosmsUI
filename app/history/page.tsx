"use client"

import { Breadcrumb } from "@/components/breadcrumb"
import { PageLayout } from "@/components/page-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  CheckCircle2,
  Clock,
  DollarSign,
  Filter,
  History,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Search,
  XCircle
} from "lucide-react"
import { useEffect, useState } from "react"

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

const API_BASE_URL = "https://luco-backend.onrender.com/api/v1"

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

const getStatusBadge = (status: string) => {
  const normalizedStatus = status.toLowerCase()
  const styles: Record<string, string> = {
    success: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    delivered: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    failed: "bg-red-500/10 text-red-500 border-red-500/20",
    pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  }
  return (
    <Badge variant="outline" className={`capitalize ${styles[normalizedStatus] || ""}`}>
      {status}
    </Badge>
  )
}

const formatCurrency = (amount: number) => {
  return `UGX ${amount.toLocaleString()}`
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function HistoryPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [spending, setSpending] = useState<SpendingReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(0)
  const itemsPerPage = 10

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const [messagesRes, summaryRes, spendingRes] = await Promise.all([
          fetch(`${API_BASE_URL}/account/reports/messages?skip=0&limit=100`),
          fetch(`${API_BASE_URL}/account/reports/summary`),
          fetch(`${API_BASE_URL}/account/reports/spending`),
        ])

        if (!messagesRes.ok || !summaryRes.ok || !spendingRes.ok) {
          throw new Error("Failed to fetch data")
        }

        const messagesData = await messagesRes.json()
        const summaryData = await summaryRes.json()
        const spendingData = await spendingRes.json()

        setMessages(messagesData)
        setSummary(summaryData)
        setSpending(spendingData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredMessages = messages.filter((msg) => {
    const matchesSearch =
      msg.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.sender_id.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || msg.status.toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  const paginatedMessages = filteredMessages.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  )

  const totalPages = Math.ceil(filteredMessages.length / itemsPerPage)

  if (loading) {
    return (
      <PageLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading message history...</p>
          </div>
        </div>
      </PageLayout>
    )
  }

  if (error) {
    return (
      <PageLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <XCircle className="h-12 w-12 text-red-500" />
            <p className="text-lg font-semibold">Error loading data</p>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </PageLayout>
    )
  }

  const deliveryRate = summary
    ? summary.messages.total_sent > 0
      ? ((summary.messages.delivered / summary.messages.total_sent) * 100).toFixed(1)
      : "0.0"
    : "0.0"

  return (
    <PageLayout>
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "History" }]} />

        <div>
          <h1 className="text-balance text-xl font-bold tracking-tight">Message History</h1>
          <p className="mt-2 text-pretty text-sm text-muted-foreground">
            Track and analyze all your SMS messages with real-time delivery status
          </p>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-4">
          <Card className=" bg-card/50 backdrop-blur shadow-none border-blue-400">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.messages.total_sent || 0}</div>
              <p className="text-xs text-muted-foreground">
                {spending?.summary.total_messages || 0} in current period
              </p>
            </CardContent>
          </Card>

          <Card className="border-orange-400 bg-card/50 backdrop-blur shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{deliveryRate}%</div>
              <p className="text-xs text-muted-foreground">
                {summary?.messages.delivered || 0} delivered
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-400 bg-card/50 backdrop-blur shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(spending?.summary.total_spent || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Balance: {formatCurrency(summary?.wallet.current_balance || 0)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-400 bg-card/50 backdrop-blur shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(spending?.summary.average_cost_per_message || 0)}
              </div>
              <p className="text-xs text-muted-foreground">per message</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/40 bg-card/50 backdrop-blur shadow-none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent Messages
                </CardTitle>
                <CardDescription>View and filter your message history</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search messages, recipients..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filteredMessages.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center rounded-lg border border-border/40">
                <div className="text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-sm font-medium">No messages found</p>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery || statusFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Start sending messages to see them here"}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-lg border border-border/40">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="font-semibold">Message ID</TableHead>
                        <TableHead className="font-semibold">Recipient</TableHead>
                        <TableHead className="font-semibold">Message</TableHead>
                        <TableHead className="font-semibold">Sender ID</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Time</TableHead>
                        <TableHead className="font-semibold">Cost</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedMessages.map((msg) => (
                        <TableRow key={msg.id} className="group">
                          <TableCell className="font-mono text-sm font-medium">
                            #{msg.id}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{msg.recipient}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <p className="truncate text-sm">{msg.message}</p>
                          </TableCell>
                          <TableCell className="text-sm">{msg.sender_id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(msg.status)}
                              {getStatusBadge(msg.status)}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(msg.created_at)}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(msg.cost)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">More options</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <p>
                    Showing {currentPage * itemsPerPage + 1}-
                    {Math.min((currentPage + 1) * itemsPerPage, filteredMessages.length)} of{" "}
                    {filteredMessages.length} messages
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 0}
                      onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages - 1}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}