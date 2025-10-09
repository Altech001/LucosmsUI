"use client"

import { PageLayout } from "@/components/page-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Database,
  Activity,
  HardDrive,
  Zap,
  Clock,
  TableIcon,
  Search,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

// Sample data for charts
const storageData = [
  { time: "00:00", used: 2.1, available: 7.9 },
  { time: "04:00", used: 2.3, available: 7.7 },
  { time: "08:00", used: 2.8, available: 7.2 },
  { time: "12:00", used: 3.2, available: 6.8 },
  { time: "16:00", used: 3.5, available: 6.5 },
  { time: "20:00", used: 3.8, available: 6.2 },
  { time: "Now", used: 4.2, available: 5.8 },
]

const queryData = [
  { time: "00:00", queries: 1200 },
  { time: "04:00", queries: 800 },
  { time: "08:00", queries: 2400 },
  { time: "12:00", queries: 3800 },
  { time: "16:00", queries: 4200 },
  { time: "20:00", queries: 3600 },
  { time: "Now", queries: 2800 },
]

const operationData = [
  { name: "SELECT", value: 65, color: "hsl(var(--chart-1))" },
  { name: "INSERT", value: 20, color: "hsl(var(--chart-2))" },
  { name: "UPDATE", value: 10, color: "hsl(var(--chart-3))" },
  { name: "DELETE", value: 5, color: "hsl(var(--chart-4))" },
]

const recentActions = [
  { id: 1, operation: "INSERT", table: "messages", rows: 1, duration: "12ms", status: "success", time: "2 min ago" },
  { id: 2, operation: "SELECT", table: "contacts", rows: 150, duration: "45ms", status: "success", time: "5 min ago" },
  { id: 3, operation: "UPDATE", table: "users", rows: 1, duration: "8ms", status: "success", time: "8 min ago" },
  { id: 4, operation: "DELETE", table: "templates", rows: 3, duration: "15ms", status: "success", time: "12 min ago" },
  { id: 5, operation: "SELECT", table: "messages", rows: 500, duration: "120ms", status: "slow", time: "15 min ago" },
  { id: 6, operation: "INSERT", table: "contacts", rows: 25, duration: "35ms", status: "success", time: "18 min ago" },
]

const tables = [
  { name: "messages", rows: "45,234", size: "2.1 GB", growth: "+12%" },
  { name: "contacts", rows: "8,456", size: "450 MB", growth: "+5%" },
  { name: "users", rows: "1,234", size: "120 MB", growth: "+2%" },
  { name: "templates", rows: "156", size: "8 MB", growth: "0%" },
  { name: "groups", rows: "89", size: "4 MB", growth: "+1%" },
]

export default function DatabasePage() {
  return (
    <PageLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-1 text-3xl font-bold">Database</h1>
            <p className="text-sm text-muted-foreground">Monitor your database usage, performance, and activity</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Search className="mr-2 h-4 w-4" />
              Query Editor
            </Button>
            <Button size="sm">
              <Database className="mr-2 h-4 w-4" />
              New Table
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4.2 GB</div>
              <p className="text-xs text-muted-foreground">
                <span className="inline-flex items-center text-green-500">
                  <ArrowUpRight className="mr-1 h-3 w-3" />
                  +8.2%
                </span>{" "}
                from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Queries/Hour</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2,847</div>
              <p className="text-xs text-muted-foreground">
                <span className="inline-flex items-center text-red-500">
                  <ArrowDownRight className="mr-1 h-3 w-3" />
                  -3.1%
                </span>{" "}
                from last hour
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">42ms</div>
              <p className="text-xs text-muted-foreground">
                <span className="inline-flex items-center text-green-500">
                  <ArrowDownRight className="mr-1 h-3 w-3" />
                  -12%
                </span>{" "}
                faster than avg
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12/50</div>
              <p className="text-xs text-muted-foreground">24% pool utilization</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Storage Usage Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Storage Usage</CardTitle>
                  <CardDescription>Last 24 hours</CardDescription>
                </div>
                <Badge variant="outline">10 GB Total</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={storageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `${value}GB`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Line type="monotone" dataKey="used" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Query Activity Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Query Activity</CardTitle>
                  <CardDescription>Queries per hour</CardDescription>
                </div>
                <Badge variant="outline">Real-time</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={queryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Bar dataKey="queries" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Operations Distribution & Tables */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Operations Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Operations</CardTitle>
              <CardDescription>Distribution by type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={operationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {operationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {operationData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tables Overview */}
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Tables</CardTitle>
                  <CardDescription>Database tables overview</CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                  <TableIcon className="mr-2 h-4 w-4" />
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tables.map((table) => (
                  <div
                    key={table.name}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                        <TableIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">{table.name}</div>
                        <div className="text-xs text-muted-foreground">{table.rows} rows</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">{table.size}</div>
                        <div className="text-xs text-muted-foreground">{table.growth}</div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Activity</CardTitle>
                <CardDescription>Latest database operations</CardDescription>
              </div>
              <Tabs defaultValue="all" className="w-auto">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="slow">Slow</TabsTrigger>
                  <TabsTrigger value="errors">Errors</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Badge variant={action.status === "slow" ? "destructive" : "secondary"}>{action.operation}</Badge>
                    <div>
                      <div className="font-medium">{action.table}</div>
                      <div className="text-xs text-muted-foreground">{action.rows} rows affected</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">{action.duration}</span>
                    <span className="text-muted-foreground">{action.time}</span>
                    <Button variant="ghost" size="sm">
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
