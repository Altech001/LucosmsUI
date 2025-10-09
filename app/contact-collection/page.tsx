"use client"

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
  Download,
  Edit,
  FileSpreadsheet,
  FolderOpen,
  Mail,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Tag,
  Trash2,
  Upload,
  UserPlus,
  Loader2,
  Users
} from "lucide-react"
import { useState, useEffect, ChangeEvent } from "react"
import { useToast } from "@/contexts/toast-context"

const API_BASE_URL = "https://luco-backend.onrender.com/api/v1"

// Type Definitions
interface Group {
  id: number
  user_id: string
  name: string
  description: string
  created_at: string
  updated_at: string
  contact_count?: number
}

interface Contact {
  id: number
  user_id: string
  phone_number: string
  name: string
  email: string
  is_active: boolean
  created_at: string
  updated_at: string
  groups?: Group[]
}

interface GroupFormData {
  name: string
  description: string
}

interface ContactFormData {
  firstName: string
  lastName: string
  phone: string
  email: string
  groupId: string
}

interface BulkImportResponse {
  created: number
  skipped: number
  skipped_numbers: string[]
  message: string
}

interface ContactToImport {
  name: string
  phone_number: string
  email?: string
}

// Utility function to format phone numbers to UG format
const formatPhoneNumberUG = (phone: string): string => {
  if (!phone) return ""
  let cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.startsWith('0')) {
    cleaned = '256' + cleaned.slice(1)
  }
  
  if (!cleaned.startsWith('256')) {
    cleaned = '256' + cleaned
  }
  
  return '+' + cleaned
}

export default function ContactCollectionPage() {
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [contactSearchQuery, setContactSearchQuery] = useState<string>("")
  const [selectedGroup, setSelectedGroup] = useState<string>("all")
  const [activeTab, setActiveTab] = useState<string>("groups")
  const [groups, setGroups] = useState<Group[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState<boolean>(false)
  const [isEditGroupOpen, setIsEditGroupOpen] = useState<boolean>(false)
  const [isAddContactOpen, setIsAddContactOpen] = useState<boolean>(false)
  const [isEditContactOpen, setIsEditContactOpen] = useState<boolean>(false)
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false)
  const [isViewGroupContactsOpen, setIsViewGroupContactsOpen] = useState<boolean>(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [importGroupId, setImportGroupId] = useState<string>("")
  const [selectedGroupForView, setSelectedGroupForView] = useState<Group | null>(null)
  const [groupContacts, setGroupContacts] = useState<Contact[]>([])
  const [loadingGroupContacts, setLoadingGroupContacts] = useState<boolean>(false)
  const { showToast } = useToast()

  // Form states
  const [groupForm, setGroupForm] = useState<GroupFormData>({ name: "", description: "" })
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [contactForm, setContactForm] = useState<ContactFormData>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    groupId: ""
  })
  const [editingContact, setEditingContact] = useState<Contact | null>(null)

  // Fetch groups with contact count
  const fetchGroups = async (): Promise<void> => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/groups/?skip=0&limit=100`, {
        headers: { 'accept': 'application/json' }
      })
      if (response.ok) {
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
        setGroups(groupsWithDetails)
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
      showToast("Error", "Failed to fetch groups", "error")
    } finally {
      setLoading(false)
    }
  }

  // Fetch contacts
  const fetchContacts = async (): Promise<void> => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/contacts/?skip=0&limit=100&is_active=true`, {
        headers: { 'accept': 'application/json' }
      })
      if (response.ok) {
        const data: Contact[] = await response.json()
        setContacts(data || [])
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
      showToast("Error", "Failed to fetch contacts", "error")
    } finally {
      setLoading(false)
    }
  }

  // Fetch contacts for a specific group
  const fetchGroupContacts = async (groupId: number): Promise<void> => {
    try {
      setLoadingGroupContacts(true)
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}/contacts?skip=0&limit=100`, {
        headers: { 'accept': 'application/json' }
      })
      if (response.ok) {
        const data: Contact[] = await response.json()
        setGroupContacts(data || [])
      }
    } catch (error) {
      console.error('Error fetching group contacts:', error)
      showToast("Error", "Failed to fetch group contacts", "error")
    } finally {
      setLoadingGroupContacts(false)
    }
  }

  // Create group
  const handleCreateGroup = async (): Promise<void> => {
    if (!groupForm.name) {
      showToast("Validation Error", "Group name is required", "warning")
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/groups/`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: groupForm.name,
          description: groupForm.description || ""
        })
      })

      if (response.ok) {
        showToast("Success", "Group created successfully", "success")
        setIsCreateGroupOpen(false)
        setGroupForm({ name: "", description: "" })
        fetchGroups()
      } else {
        const error: { detail?: string } = await response.json()
        throw new Error(error.detail || "Failed to create group")
      }
    } catch (error) {
      console.error('Error creating group:', error)
      const errorMessage = error instanceof Error ? error.message : "Failed to create group"
      showToast("Error", errorMessage, "error")
    } finally {
      setLoading(false)
    }
  }

  // Edit group
  const handleEditGroup = async (): Promise<void> => {
    if (!groupForm.name || !editingGroup) {
      showToast("Validation Error", "Group name is required", "warning")
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/groups/${editingGroup.id}`, {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: groupForm.name,
          description: groupForm.description || ""
        })
      })

      if (response.ok) {
        showToast("Success", "Group updated successfully", "success")
        setIsEditGroupOpen(false)
        setEditingGroup(null)
        setGroupForm({ name: "", description: "" })
        fetchGroups()
      } else {
        throw new Error("Failed to update group")
      }
    } catch (error) {
      console.error('Error updating group:', error)
      showToast("Error", "Failed to update group", "error")
    } finally {
      setLoading(false)
    }
  }

  // Add contact
  const handleAddContact = async (): Promise<void> => {
    if (!contactForm.firstName || !contactForm.phone || !contactForm.groupId) {
      showToast("Validation Error", "Name, phone, and group are required", "warning")
      return
    }

    try {
      setLoading(true)
      const formattedPhone = formatPhoneNumberUG(contactForm.phone)
      const fullName = `${contactForm.firstName} ${contactForm.lastName}`.trim()

      // Create contact
      const response = await fetch(`${API_BASE_URL}/contacts/`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone_number: formattedPhone,
          name: fullName,
          email: contactForm.email || ""
        })
      })

      if (response.ok) {
        const newContact: Contact = await response.json()
        
        // Add contact to group
        const groupResponse = await fetch(`${API_BASE_URL}/groups/${contactForm.groupId}/contacts`, {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contact_ids: [newContact.id]
          })
        })

        if (groupResponse.ok) {
          showToast("Success", "Contact added successfully", "success")
          setIsAddContactOpen(false)
          setContactForm({ firstName: "", lastName: "", phone: "", email: "", groupId: "" })
          fetchContacts()
          fetchGroups()
        } else {
          throw new Error("Failed to add contact to group")
        }
      } else {
        const error: { detail?: string } = await response.json()
        throw new Error(error.detail || "Failed to add contact")
      }
    } catch (error) {
      console.error('Error adding contact:', error)
      const errorMessage = error instanceof Error ? error.message : "Failed to add contact"
      showToast("Error", errorMessage, "error")
    } finally {
      setLoading(false)
    }
  }

  // Edit contact
  const handleEditContact = async (): Promise<void> => {
    if (!contactForm.firstName || !contactForm.phone || !editingContact) {
      showToast("Validation Error", "Name and phone are required", "warning")
      return
    }

    try {
      setLoading(true)
      const formattedPhone = formatPhoneNumberUG(contactForm.phone)
      const fullName = `${contactForm.firstName} ${contactForm.lastName}`.trim()

      const response = await fetch(`${API_BASE_URL}/contacts/${editingContact.id}`, {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone_number: formattedPhone,
          name: fullName,
          email: contactForm.email || "",
          is_active: true
        })
      })

      if (response.ok) {
        showToast("Success", "Contact updated successfully", "success")
        setIsEditContactOpen(false)
        setEditingContact(null)
        setContactForm({ firstName: "", lastName: "", phone: "", email: "", groupId: "" })
        fetchContacts()
      } else {
        throw new Error("Failed to update contact")
      }
    } catch (error) {
      console.error('Error updating contact:', error)
      showToast("Error", "Failed to update contact", "error")
    } finally {
      setLoading(false)
    }
  }

  // Handle CSV upload
  const handleCSVUpload = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    if (file) {
      setCsvFile(file)
    }
  }

  // Import contacts from CSV
  const handleImportContacts = async (): Promise<void> => {
    if (!csvFile || !importGroupId) {
      showToast("Validation Error", "Please select a file and group", "warning")
      return
    }

    try {
      setLoading(true)
      const text = await csvFile.text()
      const lines = text.split('\n').filter((line: string) => line.trim())
      
      if (lines.length < 2) {
        showToast("Error", "CSV file is empty or invalid", "error")
        return
      }

      const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase())
      const contactsToImport: ContactToImport[] = []
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v: string) => v.trim())
        const contact: ContactToImport = {
          name: "",
          phone_number: ""
        }
        
        headers.forEach((header: string, index: number) => {
          if (header.includes('name')) {
            contact.name = values[index]
          } else if (header.includes('phone')) {
            contact.phone_number = formatPhoneNumberUG(values[index])
          } else if (header.includes('email')) {
            contact.email = values[index] || ""
          }
        })
        
        if (contact.name && contact.phone_number) {
          contactsToImport.push(contact)
        }
      }

      if (contactsToImport.length === 0) {
        showToast("Error", "No valid contacts found in CSV", "error")
        return
      }

      // Bulk create contacts
      const bulkResponse = await fetch(`${API_BASE_URL}/contacts/bulk`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contactsToImport)
      })

      if (bulkResponse.ok) {
        const result: BulkImportResponse = await bulkResponse.json()
        
        // Get newly created contacts
        const allContactsResponse = await fetch(`${API_BASE_URL}/contacts/?skip=0&limit=1000&is_active=true`)
        const allContacts: Contact[] = await allContactsResponse.json()
        
        // Get IDs of newly created contacts (last N contacts)
        const newContactIds = allContacts.slice(-result.created).map((c: Contact) => c.id)
        
        if (newContactIds.length > 0) {
          // Add contacts to group
          await fetch(`${API_BASE_URL}/groups/${importGroupId}/contacts`, {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ contact_ids: newContactIds })
          })
        }

        showToast("Success", `Imported ${result.created} contacts successfully`, "success")
        setIsImportOpen(false)
        setCsvFile(null)
        setImportGroupId("")
        fetchContacts()
        fetchGroups()
      } else {
        throw new Error("Failed to import contacts")
      }
    } catch (error) {
      console.error('Error importing contacts:', error)
      showToast("Error", "Failed to import contacts", "error")
    } finally {
      setLoading(false)
    }
  }

  // Delete group
  const handleDeleteGroup = async (group: Group): Promise<void> => {
    if (!window.confirm(`Are you sure you want to delete "${group.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/groups/${group.id}`, {
        method: 'DELETE',
        headers: { 'accept': '*/*' }
      })

      if (response.ok) {
        showToast("Success", "Group deleted successfully", "success")
        fetchGroups()
      } else {
        throw new Error("Failed to delete group")
      }
    } catch (error) {
      console.error('Error deleting group:', error)
      showToast("Error", "Failed to delete group", "error")
    }
  }

  // Delete contact
  const handleDeleteContact = async (contact: Contact): Promise<void> => {
    if (!window.confirm(`Are you sure you want to delete "${contact.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/contacts/${contact.id}`, {
        method: 'DELETE',
        headers: { 'accept': '*/*' }
      })

      if (response.ok) {
        showToast("Success", "Contact deleted successfully", "success")
        fetchContacts()
        if (isViewGroupContactsOpen && selectedGroupForView) {
          fetchGroupContacts(selectedGroupForView.id)
        }
      } else {
        throw new Error("Failed to delete contact")
      }
    } catch (error) {
      console.error('Error deleting contact:', error)
      showToast("Error", "Failed to delete contact", "error")
    }
  }

  // Remove contact from group
  const handleRemoveFromGroup = async (groupId: number, contactId: number): Promise<void> => {
    if (!window.confirm("Remove this contact from the group?")) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}/contacts/${contactId}`, {
        method: 'DELETE',
        headers: { 'accept': 'application/json' }
      })

      if (response.ok) {
        showToast("Success", "Contact removed from group", "success")
        fetchGroupContacts(groupId)
        fetchGroups()
      } else {
        throw new Error("Failed to remove contact from group")
      }
    } catch (error) {
      console.error('Error removing contact:', error)
      showToast("Error", "Failed to remove contact from group", "error")
    }
  }

  // Open edit group dialog
  const openEditGroupDialog = (group: Group): void => {
    setEditingGroup(group)
    setGroupForm({
      name: group.name || "",
      description: group.description || ""
    })
    setIsEditGroupOpen(true)
  }

  // Open view group contacts dialog
  const openViewGroupContactsDialog = (group: Group): void => {
    setSelectedGroupForView(group)
    setIsViewGroupContactsOpen(true)
    fetchGroupContacts(group.id)
  }

  // Open edit contact dialog
  const openEditContactDialog = (contact: Contact): void => {
    setEditingContact(contact)
    const nameParts = (contact.name || "").split(" ")
    setContactForm({
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
      phone: contact.phone_number || "",
      email: contact.email || "",
      groupId: ""
    })
    setIsEditContactOpen(true)
  }

  useEffect(() => {
    fetchGroups()
    fetchContacts()
  }, [])

  const totalContacts: number = contacts.length
  const activeContacts: number = contacts.filter((c: Contact) => c.is_active).length
  const largestGroup: Group | null = groups.length > 0 
    ? groups.reduce((max: Group, g: Group) => ((g.contact_count || 0) > (max.contact_count || 0) ? g : max), groups[0])
    : null

  const filteredGroups: Group[] = groups.filter((group: Group) => 
    (group.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredContacts: Contact[] = contacts.filter((contact: Contact) => {
    const matchesSearch = 
      (contact.name || "").toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
      (contact.phone_number || "").includes(contactSearchQuery) ||
      (contact.email || "").toLowerCase().includes(contactSearchQuery.toLowerCase())
    
    return matchesSearch
  })

  return (
    <PageLayout>
      <Breadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Contact Collection" }]} />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="border-border/50 bg-card/50 backdrop-blur shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContacts}</div>
            <p className="text-xs text-muted-foreground mt-1">All contacts</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groups.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Contact groups</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeContacts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalContacts > 0 ? Math.round((activeContacts/totalContacts)*100) : 0}% active
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Largest Group</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{largestGroup?.contact_count || 0}</div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {largestGroup?.name || 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="contacts">All Contacts</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Upload className="h-4 w-4" />
                  Import
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Import Contacts</DialogTitle>
                  <DialogDescription>
                    Upload a CSV file to import multiple contacts
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Select Group</Label>
                    <Select value={importGroupId} onValueChange={setImportGroupId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a group" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map((group: Group) => (
                          <SelectItem key={group.id} value={group.id.toString()}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Upload File</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                      <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm font-medium mb-1">
                        {csvFile ? csvFile.name : 'Click to select CSV file'}
                      </p>
                      <Input 
                        type="file" 
                        accept=".csv" 
                        className="hidden" 
                        id="csv-upload" 
                        onChange={handleCSVUpload} 
                      />
                      <Label htmlFor="csv-upload" className="cursor-pointer">
                        <Button variant="outline" className="mt-3" asChild>
                          <span>Select File</span>
                        </Button>
                      </Label>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium">CSV Format:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Headers: name, phone, email</li>
                      <li>• Phone: 0708215305 or +256708215305</li>
                      <li>• Auto-formats to Uganda (+256)</li>
                    </ul>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsImportOpen(false)}>Cancel</Button>
                  <Button onClick={handleImportContacts} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Import
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                  <DialogDescription>Add a contact to your collection</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input 
                        id="firstName" 
                        placeholder="John" 
                        value={contactForm.firstName}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setContactForm({...contactForm, firstName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input 
                        id="lastName" 
                        placeholder="Doe" 
                        value={contactForm.lastName}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setContactForm({...contactForm, lastName: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input 
                      id="phone" 
                      type="tel" 
                      placeholder="0708215305" 
                      value={contactForm.phone}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setContactForm({...contactForm, phone: e.target.value})}
                    />
                    <p className="text-xs text-muted-foreground">Auto-formats to +256</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="john@example.com" 
                      value={contactForm.email}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setContactForm({...contactForm, email: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="group">Group *</Label>
                    <Select value={contactForm.groupId} onValueChange={(value: string) => setContactForm({...contactForm, groupId: value})}>
                      <SelectTrigger id="group">
                        <SelectValue placeholder="Select a group" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map((group: Group) => (
                          <SelectItem key={group.id} value={group.id.toString()}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddContactOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddContact} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Contact
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="groups" className="space-y-6">
          <Card className="border-border/50 shadow-none">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5" />
                    Contact Groups
                  </CardTitle>
                  <CardDescription>Organize contacts into groups</CardDescription>
                </div>
                <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Group
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Group</DialogTitle>
                      <DialogDescription>Create a contact group</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="groupName">Group Name *</Label>
                        <Input 
                          id="groupName" 
                          placeholder="e.g., VIP Customers" 
                          value={groupForm.name}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setGroupForm({...groupForm, name: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="groupDescription">Description</Label>
                        <Textarea 
                          id="groupDescription" 
                          placeholder="Brief description..." 
                          rows={3}
                          value={groupForm.description}
                          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setGroupForm({...groupForm, description: e.target.value})}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateGroupOpen(false)}>Cancel</Button>
                      <Button onClick={handleCreateGroup} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Group
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search groups..."
                    className="pl-9 bg-background/50 shadow-none"
                    value={searchQuery}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No groups found</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredGroups.map((group: Group) => (
                    <Card
                      key={group.id}
                      className="border-border/50 shadow-none bg-background/50 hover:bg-background/80 transition-colors"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <CardTitle className="text-base">{group.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {group.description || "No description"}
                            </CardDescription>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openViewGroupContactsDialog(group)}>
                                <Users className="mr-2 h-4 w-4" />
                                View Contacts
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditGroupDialog(group)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Group
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDeleteGroup(group)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Group
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Contacts</span>
                          <Badge variant="secondary" className="font-mono">
                            {group.contact_count || 0}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Group ID</span>
                          <span className="font-mono text-xs">#{group.id}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Created</span>
                          <span className="text-xs">
                            {new Date(group.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-6">
          <Card className="border-border/50 shadow-none">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Contacts</CardTitle>
                  <CardDescription>View and manage your contacts</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="Search contacts..." 
                    className="pl-9 bg-background/50" 
                    value={contactSearchQuery}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setContactSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No contacts found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredContacts.map((contact: Contact) => (
                    <Card
                      key={contact.id}
                      className="border-border/50 shadow-none bg-background/50 hover:bg-background/80 transition-colors"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {(contact.name || "?")
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 space-y-3">
                              <div>
                                <h3 className="font-semibold text-base">{contact.name || "Unknown"}</h3>
                                <p className="text-sm text-muted-foreground">ID: {contact.id}</p>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="truncate">{contact.phone_number || "N/A"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="truncate">{contact.email || "No email"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="text-muted-foreground">
                                    {new Date(contact.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={contact.is_active ? "default" : "secondary"} className="text-xs">
                                    {contact.is_active ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditContactDialog(contact)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Contact
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDeleteContact(contact)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Contact
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Group Dialog */}
      <Dialog open={isEditGroupOpen} onOpenChange={setIsEditGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>Update group information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editGroupName">Group Name *</Label>
              <Input 
                id="editGroupName" 
                placeholder="e.g., VIP Customers" 
                value={groupForm.name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setGroupForm({...groupForm, name: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editGroupDescription">Description</Label>
              <Textarea 
                id="editGroupDescription" 
                placeholder="Brief description..." 
                rows={3}
                value={groupForm.description}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setGroupForm({...groupForm, description: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditGroupOpen(false)}>Cancel</Button>
            <Button onClick={handleEditGroup} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={isEditContactOpen} onOpenChange={setIsEditContactOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>Update contact information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editFirstName">First Name *</Label>
                <Input 
                  id="editFirstName" 
                  placeholder="John" 
                  value={contactForm.firstName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setContactForm({...contactForm, firstName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editLastName">Last Name</Label>
                <Input 
                  id="editLastName" 
                  placeholder="Doe" 
                  value={contactForm.lastName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setContactForm({...contactForm, lastName: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editPhone">Phone Number *</Label>
              <Input 
                id="editPhone" 
                type="tel" 
                placeholder="0708215305" 
                value={contactForm.phone}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setContactForm({...contactForm, phone: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editEmail">Email</Label>
              <Input 
                id="editEmail" 
                type="email" 
                placeholder="john@example.com" 
                value={contactForm.email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setContactForm({...contactForm, email: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditContactOpen(false)}>Cancel</Button>
            <Button onClick={handleEditContact} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Group Contacts Dialog */}
      <Dialog open={isViewGroupContactsOpen} onOpenChange={setIsViewGroupContactsOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {selectedGroupForView?.name || "Group"} Contacts
            </DialogTitle>
            <DialogDescription>
              Manage contacts in this group ({groupContacts.length} contacts)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loadingGroupContacts ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : groupContacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No contacts in this group</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {groupContacts.map((contact: Contact) => (
                  <Card
                    key={contact.id}
                    className="border-border/50 bg-background/50 shadow-none"
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {(contact.name || "?")
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{contact.name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {contact.phone_number || "N/A"}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveFromGroup(selectedGroupForView!.id, contact.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewGroupContactsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}