"use client"

import * as React from "react"
import { PageLayout } from "@/components/page-layout"
import { Breadcrumb } from "@/components/breadcrumb"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Calendar, Plus, Search, Filter, MoreVertical, Edit, Trash2, Play, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/contexts/toast-context"

// Types
interface ScheduledMessage {
  id: number
  user_id: string
  recipient: string
  message: string
  sender_id: string
  scheduled_time: string
  status: "pending" | "sent" | "failed" | "cancelled"
  cost: number
  attempts: number
  error_message: string | null
  created_at: string
}

interface Group {
  id: number
  user_id: string
  name: string
  description: string
  created_at: string
  updated_at: string
  contact_count?: number
}

interface CreateScheduleRequest {
  message: string
  recipient: string
  scheduled_time: string
  sender_id: string
}

interface BulkScheduleRequest {
  message: string
  group_ids: number[]
  scheduled_time: string
  sender_id: string
}

interface UpdateScheduleRequest {
  message?: string
  scheduled_time?: string
  sender_id?: string
}

interface BulkScheduleResponse {
  total_scheduled: number
  total_cost: number
  scheduled_time: string
  message: string
}

// API Configuration
const API_BASE_URL = "https://luco-backend.onrender.com/api/v1"

// API Functions
const scheduleAPI = {
  createSchedule: async (data: CreateScheduleRequest): Promise<ScheduledMessage> => {
    const response = await fetch(`${API_BASE_URL}/schedule/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || "Failed to create schedule")
    }
    return response.json()
  },

  createBulkSchedule: async (data: BulkScheduleRequest): Promise<BulkScheduleResponse> => {
    const response = await fetch(`${API_BASE_URL}/schedule/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || "Failed to create bulk schedule")
    }
    return response.json()
  },

  getSchedules: async (params?: {
    skip?: number
    limit?: number
    status?: "pending" | "sent" | "failed" | "cancelled"
  }): Promise<ScheduledMessage[]> => {
    const queryParams = new URLSearchParams()
    if (params?.skip !== undefined) queryParams.append("skip", params.skip.toString())
    if (params?.limit !== undefined) queryParams.append("limit", params.limit.toString())
    if (params?.status) queryParams.append("status", params.status)

    const response = await fetch(`${API_BASE_URL}/schedule/?${queryParams.toString()}`, {
      headers: { accept: "application/json" },
    })
    if (!response.ok) {
      throw new Error("Failed to fetch schedules")
    }
    return response.json()
  },

  getSchedule: async (id: number): Promise<ScheduledMessage> => {
    const response = await fetch(`${API_BASE_URL}/schedule/${id}`, {
      headers: { accept: "application/json" },
    })
    if (!response.ok) {
      throw new Error("Failed to fetch schedule")
    }
    return response.json()
  },

  updateSchedule: async (id: number, data: UpdateScheduleRequest): Promise<ScheduledMessage> => {
    const response = await fetch(`${API_BASE_URL}/schedule/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || "Failed to update schedule")
    }
    return response.json()
  },

  deleteSchedule: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/schedule/${id}`, {
      method: "DELETE",
      headers: { accept: "application/json" },
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || "Failed to delete schedule")
    }
  },

  processDueMessages: async (): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/schedule/process-due`, {
      method: "POST",
      headers: { accept: "application/json" },
    })
    if (!response.ok) {
      throw new Error("Failed to process due messages")
    }
    return response.json()
  },
}

// Groups API
const groupsAPI = {
  getGroups: async (): Promise<Group[]> => {
    const response = await fetch(`${API_BASE_URL}/groups/?skip=0&limit=100`, {
      headers: { accept: "application/json" },
    })
    if (!response.ok) {
      throw new Error("Failed to fetch groups")
    }
    const data: Group[] = await response.json()
    
    // Fetch detailed info for each group to get contact count
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
}

export default function ScheduleMessagesPage() {
  const { showToast } = useToast()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [scheduledMessages, setScheduledMessages] = React.useState<ScheduledMessage[]>([])
  const [groups, setGroups] = React.useState<Group[]>([])
  const [loading, setLoading] = React.useState(false)
  const [actionLoading, setActionLoading] = React.useState<number | null>(null)
  const [statusFilter, setStatusFilter] = React.useState<"all" | "pending" | "sent" | "failed" | "cancelled">("all")
  const [editingMessage, setEditingMessage] = React.useState<ScheduledMessage | null>(null)

  const [formData, setFormData] = React.useState({
    recipient: "",
    recipientType: "single" as "single" | "group",
    selectedGroups: [] as number[],
    message: "",
    senderId: "ATUpdates",
    date: "",
    time: "",
  })

  // Fetch groups
  const fetchGroups = React.useCallback(async () => {
    try {
      const data = await groupsAPI.getGroups()
      setGroups(data)
    } catch (error) {
      showToast("Error", error instanceof Error ? error.message : "Failed to fetch schedules", "error")
    }
  }, [])

  // Fetch schedules
  const fetchSchedules = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = statusFilter !== "all" ? { status: statusFilter, limit: 100 } : { limit: 100 }
      const data = await scheduleAPI.getSchedules(params)
      setScheduledMessages(data)
    } catch (error) {
      showToast("Error", error instanceof Error ? error.message : "Failed to fetch schedules", "error")
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  React.useEffect(() => {
    fetchSchedules()
    fetchGroups()
  }, [fetchSchedules, fetchGroups])

  // Handle create schedule
  const handleCreateSchedule = async () => {
    if (!formData.message || !formData.date || !formData.time) {
        showToast("Validation Error", "Please fill in all required fields", "error")

      return
    }

    setLoading(true)
    try {
      const scheduledTime = new Date(`${formData.date}T${formData.time}`).toISOString()

      if (formData.recipientType === "single") {
        if (!formData.recipient) {
          throw new Error("Recipient phone number is required")
        }
        await scheduleAPI.createSchedule({
          message: formData.message,
          recipient: formData.recipient,
          scheduled_time: scheduledTime,
          sender_id: formData.senderId,
        })
        showToast("Success", "Group created successfully", "success")
      } else {
        if (formData.selectedGroups.length === 0) {
          throw new Error("At least one group must be selected")
        }
        const response = await scheduleAPI.createBulkSchedule({
          message: formData.message,
          group_ids: formData.selectedGroups,
          scheduled_time: scheduledTime,
          sender_id: formData.senderId,
        })
        showToast("Success", "Group created successfully", "success")
      }

      setIsCreateDialogOpen(false)
      setFormData({
        recipient: "",
        recipientType: "single",
        selectedGroups: [],
        message: "",
        senderId: "ATUpdates",
        date: "",
        time: "",
      })
      fetchSchedules()
    } catch (error) {
     showToast("Error", error instanceof Error ? error.message : "Failed to fetch schedules", "error")
    } finally {
      setLoading(false)
    }
  }

  // Handle update schedule
  const handleUpdateSchedule = async () => {
    if (!editingMessage) return

    setLoading(true)
    try {
      const scheduledTime = formData.date && formData.time 
        ? new Date(`${formData.date}T${formData.time}`).toISOString()
        : undefined

      await scheduleAPI.updateSchedule(editingMessage.id, {
        message: formData.message || undefined,
        scheduled_time: scheduledTime,
        sender_id: formData.senderId || undefined,
      })

      showToast("Success", "Group created successfully", "success")
      setIsEditDialogOpen(false)
      setEditingMessage(null)
      fetchSchedules()
    } catch (error) {
      showToast("Error", error instanceof Error ? error.message : "Failed to fetch schedules", "error")
    } finally {
      setLoading(false)
    }
  }

  // Handle delete schedule
  const handleDeleteSchedule = async (id: number) => {
    setActionLoading(id)
    try {
      await scheduleAPI.deleteSchedule(id)
      showToast("Success", "Group created successfully", "success")
      fetchSchedules()
    } catch (error) {
      showToast("Error", error instanceof Error ? error.message : "Failed to fetch schedules", "error")
    } finally {
      setActionLoading(null)
    }
  }

  // Handle send now
  const handleSendNow = async () => {
    setLoading(true)
    try {
      const response = await scheduleAPI.processDueMessages()
      showToast("Success", "Group created successfully", "success")
      fetchSchedules()
    } catch (error) {
      showToast("Error", error instanceof Error ? error.message : "Failed to fetch schedules", "error")
    } finally {
      setLoading(false)
    }
  }

  // Open edit dialog
  const openEditDialog = (message: ScheduledMessage) => {
    setEditingMessage(message)
    const scheduledDate = new Date(message.scheduled_time)
    setFormData({
      recipient: message.recipient,
      recipientType: "single",
      selectedGroups: [],
      message: message.message,
      senderId: message.sender_id,
      date: scheduledDate.toISOString().split("T")[0],
      time: scheduledDate.toTimeString().slice(0, 5),
    })
    setIsEditDialogOpen(true)
  }

  // Toggle group selection
  const toggleGroupSelection = (groupId: number) => {
    setFormData(prev => ({
      ...prev,
      selectedGroups: prev.selectedGroups.includes(groupId)
        ? prev.selectedGroups.filter(id => id !== groupId)
        : [...prev.selectedGroups, groupId]
    }))
  }

  const filteredMessages = scheduledMessages.filter(
    (msg) =>
      msg.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.id.toString().includes(searchQuery),
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "default"
      case "sent":
        return "secondary"
      case "failed":
        return "destructive"
      case "cancelled":
        return "outline"
      default:
        return "default"
    }
  }

  // Calculate statistics
  const stats = React.useMemo(() => {
    const pending = scheduledMessages.filter((m) => m.status === "pending")
    const totalRecipients = scheduledMessages.reduce((acc, msg) => acc + 1, 0)
    const totalCost = scheduledMessages.reduce((acc, msg) => acc + msg.cost, 0)
    
    const nextMessage = pending
      .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime())[0]
    
    const timeUntilNext = nextMessage
      ? Math.max(0, new Date(nextMessage.scheduled_time).getTime() - Date.now())
      : 0
    
    const hours = Math.floor(timeUntilNext / (1000 * 60 * 60))
    const minutes = Math.floor((timeUntilNext % (1000 * 60 * 60)) / (1000 * 60))

    return {
      activeSchedules: pending.length,
      totalRecipients,
      totalCost,
      nextSend: timeUntilNext > 0 ? `${hours}h ${minutes}m` : "None",
      thisMonth: scheduledMessages.length,
    }
  }, [scheduledMessages])

  return (
    <PageLayout>
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/" },
            { label: "Schedule Messages", href: "/schedule-messages" },
          ]}
        />

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-balance text-xl font-bold tracking-tight">Schedule Messages</h1>
            <p className="mt-2 text-pretty text-sm text-muted-foreground">
              Plan and automate your SMS campaigns for optimal delivery times
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSendNow} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              <span className="ml-2">Process Due</span>
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Schedule Message
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Schedule New Message</DialogTitle>
                  <DialogDescription>Set up a message to be sent at a specific date and time</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Recipient Type</Label>
                    <Select
                      value={formData.recipientType}
                      onValueChange={(value: "single" | "group") =>
                        setFormData({ ...formData, recipientType: value, selectedGroups: [], recipient: "" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single Contact</SelectItem>
                        <SelectItem value="group">Group(s)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.recipientType === "single" ? (
                    <div className="space-y-2">
                      <Label htmlFor="recipient">Phone Number</Label>
                      <Input
                        id="recipient"
                        placeholder="+256708315306"
                        value={formData.recipient}
                        onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">Enter phone number with country code</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Select Groups</Label>
                      <div className="border rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-2">
                        {groups.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No groups available</p>
                        ) : (
                          groups.map((group) => (
                            <div
                              key={group.id}
                              className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent cursor-pointer"
                              onClick={() => toggleGroupSelection(group.id)}
                            >
                              <input
                                type="checkbox"
                                checked={formData.selectedGroups.includes(group.id)}
                                onChange={() => toggleGroupSelection(group.id)}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{group.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {group.contact_count || 0} contacts
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      {formData.selectedGroups.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {formData.selectedGroups.length} group(s) selected
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Type your message here..."
                      className="min-h-[120px] resize-none"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formData.message.length} / 160 characters</span>
                      <span>{Math.ceil(formData.message.length / 160) || 1} SMS segment(s)</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="senderId">Sender ID</Label>
                    <Input
                      id="senderId"
                      placeholder="ATUpdates"
                      value={formData.senderId}
                      onChange={(e) => setFormData({ ...formData, senderId: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button className="flex-1" onClick={handleCreateSchedule} disabled={loading}>
                      {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Calendar className="mr-2 h-4 w-4" />
                      )}
                      Schedule Message
                    </Button>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          <Card className="shadow-none border-blue-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Schedules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.activeSchedules}</div>
              <p className="mt-1 text-xs text-muted-foreground">Messages queued</p>
            </CardContent>
          </Card>

          <Card className="shadow-none border-green-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Recipients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalRecipients}</div>
              <p className="mt-1 text-xs text-muted-foreground">Contacts to reach</p>
            </CardContent>
          </Card>

          <Card className="shadow-none border-amber-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Next Send</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.nextSend}</div>
              <p className="mt-1 text-xs text-muted-foreground">Until next message</p>
            </CardContent>
          </Card>

          <Card className="shadow-none border-red-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalCost}</div>
              <p className="mt-1 text-xs text-muted-foreground">UGX estimated</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-none">
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Scheduled Messages</CardTitle>
                <CardDescription>Manage your upcoming automated messages</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger className="w-32">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading && scheduledMessages.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No scheduled messages found</div>
            ) : (
              <div className="space-y-4">
                {filteredMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="group flex flex-col gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/50 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusColor(msg.status)} className="capitalize">
                          {msg.status}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">#{msg.id}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{msg.recipient}</h3>
                          <span className="text-sm text-muted-foreground">• {msg.sender_id}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{msg.message}</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(msg.scheduled_time)}</span>
                        </div>
                        <span>Cost: {msg.cost} UGX</span>
                        {msg.attempts > 0 && <span>Attempts: {msg.attempts}</span>}
                      </div>
                      {msg.error_message && (
                        <p className="text-xs text-destructive">Error: {msg.error_message}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {msg.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2"
                          onClick={() => openEditDialog(msg)}
                          disabled={actionLoading === msg.id}
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={actionLoading === msg.id}>
                            {actionLoading === msg.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreVertical className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {msg.status === "pending" && (
                            <>
                              <DropdownMenuItem onClick={() => openEditDialog(msg)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteSchedule(msg.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Cancel
                              </DropdownMenuItem>
                            </>
                          )}
                          {msg.status !== "pending" && (
                            <DropdownMenuItem disabled>
                              <span className="text-muted-foreground">No actions available</span>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Scheduled Message</DialogTitle>
              <DialogDescription>Update the message details (only pending messages can be edited)</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-message">Message</Label>
                <Textarea
                  id="edit-message"
                  placeholder="Type your message here..."
                  className="min-h-[120px] resize-none"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-senderId">Sender ID</Label>
                <Input
                  id="edit-senderId"
                  value={formData.senderId}
                  onChange={(e) => setFormData({ ...formData, senderId: e.target.value })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-date">Date</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-time">Time</Label>
                  <Input
                    id="edit-time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button className="flex-1" onClick={handleUpdateSchedule} disabled={loading}>
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Edit className="mr-2 h-4 w-4" />
                  )}
                  Update Schedule
                </Button>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  )
}