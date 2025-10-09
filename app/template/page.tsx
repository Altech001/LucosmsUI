"use client"

import * as React from "react"
import { PageLayout } from "@/components/page-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Search,
  Plus,
  Copy,
  Edit,
  Loader2,
  MessageSquare,
  FileText,
  Trash2,
} from "lucide-react"
import { Breadcrumb } from "@/components/breadcrumb"
import { useToast } from "@/contexts/toast-context"

interface Template {
  id: number
  user_id: string
  name: string
  content: string
  created_at: string
}

interface TemplateFormData {
  name: string
  content: string
}

const API_BASE_URL = "https://luco-backend.onrender.com/api/v1"

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function TemplatesPage() {
  const [templates, setTemplates] = React.useState<Template[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [selectedTemplate, setSelectedTemplate] = React.useState<Template | null>(null)
  const [formData, setFormData] = React.useState<TemplateFormData>({ name: "", content: "" })
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const { showToast } = useToast()

  // Fetch templates on mount
  React.useEffect(() => {
    fetchTemplates()
  }, [])

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchTemplates(searchQuery)
      } else {
        fetchTemplates()
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/templates/?skip=0&limit=100`)
      if (!response.ok) throw new Error("Failed to fetch templates")
      const data = await response.json()
      setTemplates(data)
    } catch (error) {
      console.error("Error fetching templates:", error)
      showToast("Error", "Failed to load templates. Please try again.", "error")
    } finally {
      setLoading(false)
    }
  }

  const searchTemplates = async (query: string) => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/templates/search/${encodeURIComponent(query)}`)
      if (!response.ok) throw new Error("Search failed")
      const data = await response.json()
      setTemplates(data)
    } catch (error) {
      console.error("Error searching templates:", error)
      showToast("Search Error", "Failed to search templates. Showing all templates.", "warning")
      fetchTemplates() // Fallback to showing all templates
    } finally {
      setLoading(false)
    }
  }

  const createTemplate = async () => {
    if (!formData.name.trim() || !formData.content.trim()) {
      showToast("Validation Error", "Please fill in all fields.", "warning")
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch(`${API_BASE_URL}/templates/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Failed to create template")

      const newTemplate = await response.json()
      setTemplates((prev) => [newTemplate, ...prev])
      setIsCreateDialogOpen(false)
      setFormData({ name: "", content: "" })
      showToast("Success", "Template created successfully!", "success")
    } catch (error) {
      console.error("Error creating template:", error)
      showToast("Error", "Failed to create template. Please try again.", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateTemplate = async () => {
    if (!selectedTemplate || !formData.name.trim() || !formData.content.trim()) {
      showToast("Validation Error", "Please fill in all fields.", "warning")
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch(`${API_BASE_URL}/templates/${selectedTemplate.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Failed to update template")

      const updatedTemplate = await response.json()
      setTemplates((prev) => prev.map((t) => (t.id === updatedTemplate.id ? updatedTemplate : t)))
      setIsEditDialogOpen(false)
      setSelectedTemplate(null)
      setFormData({ name: "", content: "" })
      showToast("Success", "Template updated successfully!", "success")
    } catch (error) {
      console.error("Error updating template:", error)
      showToast("Error", "Failed to update template. Please try again.", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteTemplate = async (template: Template) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch(`${API_BASE_URL}/templates/${template.id}`, {
        method: "DELETE",
        headers: {
          accept: "*/*",
        },
      })

      if (!response.ok) throw new Error("Failed to delete template")

      setTemplates((prev) => prev.filter((t) => t.id !== template.id))
      showToast("Success", "Template deleted successfully!", "success")
    } catch (error) {
      console.error("Error deleting template:", error)
      showToast("Error", "Failed to delete template. Please try again.", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content)
    showToast("Copied!", "Template content copied to clipboard.", "success")
  }

  const openCreateDialog = () => {
    setFormData({ name: "", content: "" })
    setIsCreateDialogOpen(true)
  }

  const openEditDialog = (template: Template) => {
    setSelectedTemplate(template)
    setFormData({ name: template.name, content: template.content })
    setIsEditDialogOpen(true)
  }

  return (
    <PageLayout>
      <div className="mx-auto max-w-6xl space-y-8 py-8">
        <Breadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Templates" }]} />

        <div className="space-y-4">
          <h1 className="text-balance text-xl font-bold tracking-tight text-foreground">Message Templates</h1>
          <p className="max-w-2xl text-pretty text-sm text-muted-foreground">
            Create and manage reusable message templates to streamline your SMS campaigns.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              className="pl-9 shadow-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button size="lg" className="gap-2" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        </div>

        {loading ? (
          <div className="flex h-[400px] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading templates...</p>
            </div>
          </div>
        ) : templates.length === 0 ? (
          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardContent className="flex h-[400px] flex-col items-center justify-center gap-4">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
              <div className="text-center">
                <p className="text-lg font-semibold">No templates found</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? "Try a different search term"
                    : "Create your first template to get started"}
                </p>
              </div>
              {!searchQuery && (
                <Button onClick={openCreateDialog} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Template
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="border-border/40 bg-card/50 backdrop-blur transition-colors hover:bg-card/80 shadow-none"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <MessageSquare className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{template.name}</CardTitle>
                        <CardDescription className="mt-1">
                          <span className="text-xs text-muted-foreground">
                            Created {formatDate(template.created_at)}
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-border/40 bg-muted/50 p-4">
                    <p className="text-sm leading-relaxed text-muted-foreground">{template.content}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">ID: #{template.id}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-2"
                        onClick={() => copyToClipboard(template.content)}
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-2"
                        onClick={() => openEditDialog(template)}
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-2 text-destructive hover:text-destructive"
                        onClick={() => deleteTemplate(template)}
                        disabled={isSubmitting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
              <DialogDescription>
                Create a reusable message template for your SMS campaigns.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Welcome Message"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Message Content</Label>
                <Textarea
                  id="content"
                  placeholder="Enter your message template here..."
                  rows={8}
                  value={formData.content}
                  onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Use variables like {"{name}"}, {"{code}"}, {"{date}"} for dynamic content
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createTemplate} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Template"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Edit Template</DialogTitle>
              <DialogDescription>Make changes to your message template.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Template Name</Label>
                <Input
                  id="edit-name"
                  placeholder="e.g., Welcome Message"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-content">Message Content</Label>
                <Textarea
                  id="edit-content"
                  placeholder="Enter your message template here..."
                  rows={6}
                  value={formData.content}
                  onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={updateTemplate} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  )
}