"use client"

import * as React from "react"
import { PageLayout } from "@/components/page-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/contexts/toast-context" // Assuming toast context is available
import { Breadcrumb } from "@/components/breadcrumb"


export default function ProfilePage() {
  const { showToast } = useToast()
  const [profileData, setProfileData] = React.useState({
    username: "",
    email: "",
    id: "",
    joiningDate: "",
  })
  const [isLoading, setIsLoading] = React.useState(true)

  // Fetch profile data
  React.useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("https://luco-backend.onrender.com/api/v1/account/wallet", {
          headers: { "accept": "application/json" },
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        const data = await response.json()
        setProfileData({
          username: data.username || "",
          email: data.email || "",
          id: data.id || "",
          joiningDate: data.created_at ? new Date(data.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }) : "",
        })
      } catch (error) {
        console.error("Error fetching profile data:", error)
        showToast("Error", "Failed to load profile data. Please try again.", "error")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfileData()
  }, [showToast])

  const handleSaveChanges = () => {
    // Placeholder for save functionality
    showToast("Info", "Data Manipulation is Allowed.", "info")
  }

  if (isLoading) {
    return (
      <PageLayout>
        <Breadcrumb items={[
            { label: "Dashboard", href: "/" },
            { label: "Profile", href: "/profile" },
          ]} />
        <div className="mx-auto  space-y-8">
          <div>
            <div className="h-10 w-48 animate-pulse rounded bg-muted mb-2"></div>
            <div className="h-6 w-64 animate-pulse rounded bg-muted"></div>
          </div>
          <Card>
            <CardHeader>
              <div className="h-6 w-32 animate-pulse rounded bg-muted"></div>
              <div className="h-4 w-48 animate-pulse rounded bg-muted mt-1"></div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="h-24 w-24 animate-pulse rounded-full bg-muted"></div>
                <div className="h-10 w-32 animate-pulse rounded bg-muted"></div>
              </div>
              <div className="grid gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="grid gap-2">
                    <div className="h-4 w-16 animate-pulse rounded bg-muted"></div>
                    <div className="h-10 w-full animate-pulse rounded bg-muted"></div>
                  </div>
                ))}
              </div>
              <div className="h-10 w-32 animate-pulse rounded bg-muted"></div>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className="mx-auto  space-y-8">
        <Breadcrumb items={[
            { label: "Dashboard", href: "/" },
            { label: "Profile", href: "/profile" },
          ]} />
        <div>
          <h1 className="mb-2 text-xl font-bold">Profile</h1>
          <p className="text-sm text-muted-foreground">Manage your account settings and preferences.</p>
        </div>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details and profile picture.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src="/placeholder-user.png" alt="User" />
                <AvatarFallback>{profileData.username.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <Button variant="outline">Change Photo</Button>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" defaultValue={profileData.username} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={profileData.email} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="id">ID</Label>
                <Input id="id" defaultValue={profileData.id} disabled />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="joiningDate">Joining Date</Label>
                <Input id="joiningDate" defaultValue={profileData.joiningDate} disabled />
              </div>
            </div>

            <Button onClick={handleSaveChanges}>Save Changes</Button>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}