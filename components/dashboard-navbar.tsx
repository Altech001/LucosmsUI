"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, Search, Wallet, LogOut, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useWallet, useCurrency } from "@/contexts/wallet-context"
import * as React from "react"
import { UserButton } from "@clerk/nextjs";
import dynamic from "next/dynamic";

const ClientUserButton = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.UserButton),
  { ssr: false }
);

export function DashboardNavbar() {
  const router = useRouter()
  const { 
    walletData, 
    notifications, 
    unreadCount, 
    loading, 
    markAllAsRead,
    markAsRead,
    refreshWallet,
    refreshNotifications 
  } = useWallet()
  const { formatCurrency, calculateMessages } = useCurrency()
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const handleLogout = () => {
    router.push("/login")
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([refreshWallet(), refreshNotifications()])
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const handleNotificationClick = (id: string) => {
    markAsRead(id)
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
      <div className="hidden flex-1 md:flex gap-2">
        <Link href="/topup">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 bg-transparent p-5 shadow-none hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-colors"
          >
            <Wallet className="h-4 w-4 text-purple-600" />
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="font-mono font-semibold">
                {walletData ? formatCurrency(walletData.wallet_balance) : "UGX 0"}
              </span>
            )}
          </Button>
        </Link>
        <ClientUserButton />

        {walletData && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground px-2">
            <span>≈ {calculateMessages(walletData.wallet_balance)} SMS</span>
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search messages, recipients..."
            className="h-9 w-full pl-9 md:w-[300px] lg:w-[400px] shadow-none"
          />
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="relative"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="sr-only">Refresh</span>
        </Button>


        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <>
                  <span className="absolute right-1 top-1 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                  </span>
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>Notifications</DialogTitle>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                    Mark all as read
                  </Button>
                )}
              </div>
              <DialogDescription>
                {unreadCount > 0 
                  ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                  : "You're all caught up!"}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[400px] pr-4">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-center">
                  <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-sm font-medium">No notifications yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You'll see message updates here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification.id)}
                      className={`rounded-lg border p-4 transition-all cursor-pointer hover:shadow-sm ${
                        !notification.read 
                          ? "border-primary/50 bg-primary/5 hover:bg-primary/10" 
                          : "border-border hover:bg-accent/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm">{notification.title}</h4>
                            {!notification.read && (
                              <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {notification.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src="/globe.svg" alt="User" className="w-10 h-10" />
                <AvatarFallback>
                  {walletData?.username?.slice(0, 2).toUpperCase() || "JD"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {walletData?.username || "User"}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {walletData?.email || "user@example.com"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/billing">Billing</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}