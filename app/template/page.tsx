
"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Loader2,
} from "lucide-react";
import { useToast } from "@/contexts/toast-context";
import { Breadcrumb } from "@/components/breadcrumb";

// Types
interface Template {
  id: number;
  user_id: string;
  name: string;
  content: string;
  created_at: string;
}

interface CreateTemplateRequest {
  name: string;
  content: string;
}

// API Configuration
const API_BASE_URL = "https://luco-backend.onrender.com/api/v1";

export default function TemplatePage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<Template | null>(null);
  const [newTemplate, setNewTemplate] = React.useState({
    name: "",
    content: "",
  });

  // Redirect if not signed in
  React.useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  // Fetch templates
  const fetchTemplates = async () => {
    if (!isSignedIn || !getToken) return;

    try {
      setIsLoading(true);
      
      // Get token
      const token = await getToken();
      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await fetch(
        `${API_BASE_URL}/templates/?skip=0&limit=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }

      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error("Error fetching templates:", error);
      showToast(
        "Error",
        error instanceof Error ? error.message : "Failed to load templates",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (isSignedIn) {
      fetchTemplates();
    }
  }, [isSignedIn]);

  // Create template
  const createTemplate = async () => {
    if (!newTemplate.name || !newTemplate.content) {
      showToast("Error", "Please fill in all fields", "error");
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await fetch(`${API_BASE_URL}/templates/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(newTemplate),
      });

      if (!response.ok) {
        throw new Error("Failed to create template");
      }

      showToast("Success", "Template created successfully", "success");
      setIsCreateDialogOpen(false);
      setNewTemplate({ name: "", content: "" });
      fetchTemplates();
    } catch (error) {
      console.error("Error creating template:", error);
      showToast(
        "Error",
        error instanceof Error ? error.message : "Failed to create template",
        "error"
      );
    }
  };

  // Update template
  const updateTemplate = async () => {
    if (!editingTemplate) return;

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await fetch(
        `${API_BASE_URL}/templates/${editingTemplate.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            name: editingTemplate.name,
            content: editingTemplate.content,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update template");
      }

      showToast("Success", "Template updated successfully", "success");
      setIsEditDialogOpen(false);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error("Error updating template:", error);
      showToast(
        "Error",
        error instanceof Error ? error.message : "Failed to update template",
        "error"
      );
    }
  };

  // Delete template
  const deleteTemplate = async (id: number) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await fetch(`${API_BASE_URL}/templates/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete template");
      }

      showToast("Success", "Template deleted successfully", "success");
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      showToast(
        "Error",
        error instanceof Error ? error.message : "Failed to delete template",
        "error"
      );
    }
  };

  // Filter templates
  const filteredTemplates = templates.filter(
    (template) =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isLoaded || isLoading) {
    return (
      <PageLayout>
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return (
    <PageLayout>
      <Breadcrumb
        items={[{ label: "Dashboard", href: "/" }, { label: "Templates" }]}
      />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
            <p className="text-muted-foreground">
              Create and manage reusable message templates
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Template</DialogTitle>
                <DialogDescription>
                  Create a new message template for quick composition
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Welcome Message"
                    value={newTemplate.name}
                    onChange={(e) =>
                      setNewTemplate({ ...newTemplate, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Message Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Enter your message template..."
                    className="min-h-[120px]"
                    value={newTemplate.content}
                    onChange={(e) =>
                      setNewTemplate({ ...newTemplate, content: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {newTemplate.content.length} characters
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={createTemplate}>Create Template</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {filteredTemplates.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No templates found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {searchQuery
                  ? "Try adjusting your search"
                  : "Create your first template to get started"}
              </p>
              {!searchQuery && (
                <Button
                  className="mt-4"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {new Date(template.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingTemplate(template);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            navigator.clipboard.writeText(template.content);
                            showToast(
                              "Copied",
                              "Template copied to clipboard",
                              "success"
                            );
                          }}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteTemplate(template.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {template.content}
                  </p>
                  <div className="mt-4">
                    <Badge variant="secondary">
                      {template.content.length} characters
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Template</DialogTitle>
              <DialogDescription>
                Update your message template
              </DialogDescription>
            </DialogHeader>
            {editingTemplate && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Template Name</Label>
                  <Input
                    id="edit-name"
                    value={editingTemplate.name}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        name: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-content">Message Content</Label>
                  <Textarea
                    id="edit-content"
                    className="min-h-[120px]"
                    value={editingTemplate.content}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        content: e.target.value,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {editingTemplate.content.length} characters
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingTemplate(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={updateTemplate}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}
