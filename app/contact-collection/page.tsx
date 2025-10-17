"use client"

import { Breadcrumb } from "@/components/breadcrumb"
import { PageLayout } from "@/components/page-layout"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar, Edit, FileSpreadsheet, FolderOpen, Mail, MoreVertical, Phone, Plus, Search, Trash2, Upload, UserPlus, Loader2, Users, AlertCircle, CheckCircle2, X, RefreshCw, Inbox, FileUp } from "lucide-react"
import { useState, useEffect, useRef, ChangeEvent } from "react"
import { useToast } from "@/contexts/toast-context"
import { useAuth } from "@clerk/nextjs"
import * as XLSX from 'xlsx'

const API_URL = "https://luco-backend.onrender.com/api/v1"

const formatPhone = (phone: string): string => {
  if (!phone) return ""
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('0')) cleaned = '256' + cleaned.slice(1)
  if (!cleaned.startsWith('256')) cleaned = '256' + cleaned
  return '+' + cleaned
}

const extractPhones = (text: string): string[] => {
  const matches = text.match(/(?:\+?256|0)?[7][0-9]{8}/g) || []
  return [...new Set(matches.map(formatPhone))]
}

interface ContactToImport {
  name: string
  phone_number: string
  email?: string
}

const parseFile = async (file: File): Promise<ContactToImport[]> => {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'csv') return parseCSV(file)
  if (ext === 'xlsx' || ext === 'xls') return parseExcel(file)
  throw new Error('Unsupported file format')
}

const parseCSV = async (file: File): Promise<ContactToImport[]> => {
  const text = await file.text()
  const lines = text.split('\n').filter(line => line.trim())
  if (!lines.length) return []
  
  const contacts: ContactToImport[] = []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    let name = '', phone = '', email = ''
    
    headers.forEach((header, idx) => {
      const value = values[idx] || ''
      if (header.includes('name')) name = value
      else if (header.includes('phone') || header.includes('mobile')) phone = value
      else if (header.includes('email')) email = value
    })
    
    if (!phone) {
      const phones = extractPhones(values.join(' '))
      if (phones.length) phone = phones[0]
    }
    
    if (phone) {
      contacts.push({
        name: name || `Contact ${i}`,
        phone_number: formatPhone(phone),
        email: email || undefined
      })
    }
  }
  return contacts
}

const parseExcel = async (file: File): Promise<ContactToImport[]> => {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
  if (!jsonData.length) return []
  
  const contacts: ContactToImport[] = []
  const headers = jsonData[0].map(h => String(h || '').toLowerCase())
  
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i]
    let name = '', phone = '', email = ''
    
    headers.forEach((header, idx) => {
      const value = String(row[idx] || '').trim()
      if (header.includes('name')) name = value
      else if (header.includes('phone') || header.includes('mobile')) phone = value
      else if (header.includes('email')) email = value
    })
    
    if (!phone) {
      const phones = extractPhones(row.map(c => String(c || '')).join(' '))
      if (phones.length) phone = phones[0]
    }
    
    if (phone) {
      contacts.push({
        name: name || `Contact ${i}`,
        phone_number: formatPhone(phone),
        email: email || undefined
      })
    }
  }
  return contacts
}

interface Group {
  id: number
  name: string
  description: string
  created_at: string
  contact_count?: number
}

interface Contact {
  id: number
  name: string
  phone_number: string
  email: string
  is_active: boolean
  created_at: string
}

export default function ContactCollectionPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [contactSearchQuery, setContactSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("groups")
  const [groups, setGroups] = useState<Group[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set())
  const [selectAllChecked, setSelectAllChecked] = useState(false)
  const [dialogs, setDialogs] = useState({
    createGroup: false,
    editGroup: false,
    addContact: false,
    editContact: false,
    import: false,
    viewGroupContacts: false
  })
  const [importState, setImportState] = useState({
    file: null as File | null,
    groupId: "",
    contacts: [] as ContactToImport[],
    processing: false,
    error: null as string | null
  })
  const [selectedGroupForView, setSelectedGroupForView] = useState<Group | null>(null)
  const [groupContacts, setGroupContacts] = useState<Contact[]>([])
  const [loadingGroupContacts, setLoadingGroupContacts] = useState(false)
  const { showToast } = useToast()
  const [progress, setProgress] = useState({ active: false, current: 0, total: 0, message: '' })
  const [forms, setForms] = useState({
    createGroup: { name: "", description: "" },
    editGroup: { name: "", description: "" },
    contact: { firstName: "", lastName: "", phone: "", email: "", groupId: "" }
  })
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const { getToken } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const openDialog = (name: keyof typeof dialogs) => setDialogs(prev => ({ ...prev, [name]: true }))
  const closeDialog = (name: keyof typeof dialogs) => {
    setDialogs(prev => ({ ...prev, [name]: false }))
    setTimeout(() => {
      if (name === 'import') {
        setImportState({ file: null, groupId: "", contacts: [], processing: false, error: null })
      }
      reloadData()
    }, 300)
  }

  const reloadData = () => {
    fetchGroups()
    fetchContacts()
  }

  const apiCall = async (endpoint: string, options: RequestInit = {}, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        await new Promise(resolve => setTimeout(resolve, 500))
        const token = await getToken()
        if (!token) {
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            continue
          }
          showToast("Error", "Authentication required", "error")
          return null
        }
        
        const response = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
          }
        })
        
        if (!response.ok) throw new Error(`Request failed: ${response.status}`)
        return await response.json()
      } catch (error) {
        if (i === retries - 1) throw error
      }
    }
  }

  const fetchGroups = async () => {
    try {
      setLoading(true)
      const data: Group[] = await apiCall('/groups/?skip=0&limit=100')
      if (!data) return
      
      const groupsWithDetails = await Promise.all(
        data.map(async (group) => {
          try {
            const details = await apiCall(`/groups/${group.id}`)
            return { ...group, contact_count: details?.contact_count || 0 }
          } catch {
            return { ...group, contact_count: 0 }
          }
        })
      )
      setGroups(groupsWithDetails)
    } catch (error) {
      showToast("Error", "Failed to fetch groups", "error")
    } finally {
      setLoading(false)
    }
  }

  const fetchContacts = async () => {
    try {
      setLoading(true)
      const data: Contact[] = await apiCall('/contacts/?skip=0&limit=100&is_active=true')
      setContacts(data || [])
    } catch (error) {
      showToast("Error", "Failed to fetch contacts", "error")
    } finally {
      setLoading(false)
    }
  }

  const fetchGroupContacts = async (groupId: number) => {
    try {
      setLoadingGroupContacts(true)
      const data: Contact[] = await apiCall(`/groups/${groupId}/contacts?skip=0&limit=100`)
      setGroupContacts(data || [])
    } catch (error) {
      showToast("Error", "Failed to fetch group contacts", "error")
    } finally {
      setLoadingGroupContacts(false)
    }
  }

  const handleCreateGroup = async () => {
    if (!forms.createGroup.name) {
      showToast("Validation Error", "Group name is required", "warning")
      return
    }
    try {
      setLoading(true)
      await apiCall('/groups/', {
        method: 'POST',
        body: JSON.stringify(forms.createGroup)
      })
      showToast("Success", "Group created successfully", "success")
      closeDialog('createGroup')
    } catch (error) {
      showToast("Error", "Failed to create group", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleEditGroup = async () => {
    if (!forms.editGroup.name || !editingGroup) {
      showToast("Validation Error", "Group name is required", "warning")
      return
    }
    try {
      setLoading(true)
      await apiCall(`/groups/${editingGroup.id}`, {
        method: 'PUT',
        body: JSON.stringify(forms.editGroup)
      })
      showToast("Success", "Group updated successfully", "success")
      closeDialog('editGroup')
    } catch (error) {
      showToast("Error", "Failed to update group", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleAddContact = async () => {
    const { firstName, phone, groupId } = forms.contact
    if (!firstName || !phone || !groupId) {
      showToast("Validation Error", "Name, phone, and group are required", "warning")
      return
    }
    try {
      setLoading(true)
      const newContact = await apiCall('/contacts/', {
        method: 'POST',
        body: JSON.stringify({
          phone_number: formatPhone(phone),
          name: `${firstName} ${forms.contact.lastName}`.trim(),
          email: forms.contact.email || ""
        })
      })
      
      await apiCall(`/groups/${groupId}/contacts`, {
        method: 'POST',
        body: JSON.stringify({ contact_ids: [newContact.id] })
      })
      
      showToast("Success", "Contact added successfully", "success")
      closeDialog('addContact')
    } catch (error) {
      showToast("Error", "Failed to add contact", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleEditContact = async () => {
    const { firstName, phone } = forms.contact
    if (!firstName || !phone || !editingContact) {
      showToast("Validation Error", "Name and phone are required", "warning")
      return
    }
    try {
      setLoading(true)
      await apiCall(`/contacts/${editingContact.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          phone_number: formatPhone(phone),
          name: `${firstName} ${forms.contact.lastName}`.trim(),
          email: forms.contact.email || "",
          is_active: true
        })
      })
      showToast("Success", "Contact updated successfully", "success")
      closeDialog('editContact')
    } catch (error) {
      showToast("Error", "Failed to update contact", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    setImportState(prev => ({ ...prev, file, processing: true, contacts: [], error: null }))
    
    try {
      const contacts = await parseFile(file)
      setImportState(prev => ({
        ...prev,
        processing: false,
        contacts,
        error: contacts.length === 0 ? 'No valid contacts found' : null
      }))
      
      if (contacts.length > 0) {
        showToast("Success", `Extracted ${contacts.length} contacts`, "success")
      } else {
        showToast("Warning", "No contacts found in file", "warning")
      }
    } catch (error) {
      setImportState(prev => ({
        ...prev,
        processing: false,
        error: error instanceof Error ? error.message : 'Failed to parse file'
      }))
      showToast("Error", "Failed to extract contacts", "error")
    }
  }

  const handleImportContacts = async () => {
    if (!importState.contacts.length || !importState.groupId) {
      showToast("Validation Error", "Please select a file and group", "warning")
      return
    }
    
    try {
      setLoading(true)
      setProgress({ active: true, current: 0, total: importState.contacts.length, message: 'Starting import...' })
      
      const createdContactIds: number[] = []
      let successCount = 0
      
      for (let i = 0; i < importState.contacts.length; i++) {
        const contact = importState.contacts[i]
        setProgress(prev => ({
          ...prev,
          current: i + 1,
          message: `Importing contact ${i + 1} of ${importState.contacts.length}...`
        }))
        
        try {
          const newContact = await apiCall('/contacts/', {
            method: 'POST',
            body: JSON.stringify(contact)
          })
          if (newContact) {
            createdContactIds.push(newContact.id)
            successCount++
          }
        } catch (error) {
          console.error('Failed to import contact:', contact)
        }
        
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      
      if (createdContactIds.length > 0) {
        setProgress(prev => ({ ...prev, message: 'Adding contacts to group...' }))
        await apiCall(`/groups/${importState.groupId}/contacts`, {
          method: 'POST',
          body: JSON.stringify({ contact_ids: createdContactIds })
        })
      }
      
      showToast("Success", `Imported ${successCount} contacts`, "success")
      closeDialog('import')
    } catch (error) {
      showToast("Error", "Failed to import contacts", "error")
    } finally {
      setLoading(false)
      setProgress({ active: false, current: 0, total: 0, message: '' })
    }
  }

  const handleDelete = async (type: 'group' | 'contact', item: Group | Contact) => {
    const contactCount = type === 'group' ? (item as Group).contact_count || 0 : 0
    const message = type === 'group' 
      ? `Delete "${item.name}" and all ${contactCount} contacts in it?`
      : `Delete "${item.name}"?`
    
    if (!window.confirm(`${message} This cannot be undone.`)) return
    
    try {
      const token = await getToken()
      if (!token) {
        showToast("Error", "Authentication required", "error")
        return
      }
      
      if (type === 'group') {
        setProgress({ active: true, current: 0, total: contactCount + 1, message: 'Fetching contacts...' })
        const groupContacts: Contact[] = await apiCall(`/groups/${item.id}/contacts?skip=0&limit=1000`)
        
        if (groupContacts) {
          for (let i = 0; i < groupContacts.length; i++) {
            setProgress(prev => ({ ...prev, current: i + 1, message: `Deleting contact ${i + 1}...` }))
            await fetch(`${API_URL}/contacts/${groupContacts[i].id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            })
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
        
        setProgress(prev => ({ ...prev, current: contactCount, message: 'Deleting group...' }))
      } else {
        setProgress({ active: true, current: 1, total: 1, message: 'Deleting contact...' })
      }
      
      await fetch(`${API_URL}/${type}s/${item.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      showToast("Success", `${type === 'group' ? 'Group and contacts' : 'Contact'} deleted successfully`, "success")
      reloadData()
      if (dialogs.viewGroupContacts && selectedGroupForView) {
        fetchGroupContacts(selectedGroupForView.id)
      }
    } catch (error) {
      showToast("Error", `Failed to delete ${type}`, "error")
    } finally {
      setProgress({ active: false, current: 0, total: 0, message: '' })
    }
  }

  const handleBulkDelete = async () => {
    if (!selectedContacts.size) {
      showToast("Warning", "No contacts selected", "warning")
      return
    }
    if (!window.confirm(`Delete ${selectedContacts.size} contacts? This cannot be undone.`)) return
    
    try {
      const token = await getToken()
      if (!token) {
        showToast("Error", "Authentication required", "error")
        return
      }
      
      const contactIds = Array.from(selectedContacts)
      setProgress({ active: true, current: 0, total: contactIds.length, message: 'Starting bulk delete...' })
      
      for (let i = 0; i < contactIds.length; i++) {
        setProgress(prev => ({ ...prev, current: i + 1, message: `Deleting ${i + 1} of ${contactIds.length}...` }))
        await fetch(`${API_URL}/contacts/${contactIds[i]}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      showToast("Success", `${contactIds.length} contacts deleted`, "success")
      setSelectedContacts(new Set())
      setSelectAllChecked(false)
      reloadData()
    } catch (error) {
      showToast("Error", "Failed to delete contacts", "error")
    } finally {
      setProgress({ active: false, current: 0, total: 0, message: '' })
    }
  }

  const handleRemoveFromGroup = async (groupId: number, contactId: number) => {
    if (!window.confirm("Remove this contact from the group?")) return
    
    try {
      setProgress({ active: true, current: 1, total: 1, message: 'Removing...' })
      await apiCall(`/groups/${groupId}/contacts/${contactId}`, { method: 'DELETE' })
      showToast("Success", "Contact removed from group", "success")
      fetchGroupContacts(groupId)
      reloadData()
    } catch (error) {
      showToast("Error", "Failed to remove contact", "error")
    } finally {
      setProgress({ active: false, current: 0, total: 0, message: '' })
    }
  }

  const toggleContactSelection = (id: number) => {
    const newSelected = new Set(selectedContacts)
    newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id)
    setSelectedContacts(newSelected)
  }

  const toggleSelectAll = () => {
    const filtered = contacts.filter(c => 
      c.name?.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
      c.phone_number?.includes(contactSearchQuery) ||
      c.email?.toLowerCase().includes(contactSearchQuery.toLowerCase())
    )
    
    if (selectAllChecked) {
      setSelectedContacts(new Set())
      setSelectAllChecked(false)
    } else {
      setSelectedContacts(new Set(filtered.map(c => c.id)))
      setSelectAllChecked(true)
    }
  }

  const openEditGroupDialog = (group: Group) => {
    setEditingGroup(group)
    setForms(prev => ({ ...prev, editGroup: { name: group.name || "", description: group.description || "" }}))
    openDialog('editGroup')
  }

  const openViewGroupContactsDialog = (group: Group) => {
    setSelectedGroupForView(group)
    openDialog('viewGroupContacts')
    fetchGroupContacts(group.id)
  }

  const openEditContactDialog = (contact: Contact) => {
    setEditingContact(contact)
    const nameParts = (contact.name || "").split(" ")
    setForms(prev => ({ ...prev, contact: {
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
      phone: contact.phone_number || "",
      email: contact.email || "",
      groupId: ""
    }}))
    openDialog('editContact')
  }

  const updateContactName = (index: number, newName: string) => {
    setImportState(prev => ({
      ...prev,
      contacts: prev.contacts.map((c, i) => i === index ? { ...c, name: newName } : c)
    }))
  }

  useEffect(() => {
    fetchGroups()
    fetchContacts()
  }, [])

  useEffect(() => {
    const filtered = contacts.filter(c => 
      c.name?.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
      c.phone_number?.includes(contactSearchQuery) ||
      c.email?.toLowerCase().includes(contactSearchQuery.toLowerCase())
    )
    setSelectAllChecked(filtered.length > 0 && selectedContacts.size === filtered.length)
  }, [selectedContacts, contacts, contactSearchQuery])

  const stats = {
    total: contacts.length,
    active: contacts.filter(c => c.is_active).length,
    largestGroup: groups.length > 0 ? groups.reduce((max, g) => (g.contact_count || 0) > (max.contact_count || 0) ? g : max, groups[0]) : null
  }

  const filteredGroups = groups.filter(g => g.name?.toLowerCase().includes(searchQuery.toLowerCase()))
  const filteredContacts = contacts.filter(c => 
    c.name?.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
    c.phone_number?.includes(contactSearchQuery) ||
    c.email?.toLowerCase().includes(contactSearchQuery.toLowerCase())
  )

  return (
    <PageLayout>
      {progress.active && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </CardTitle>
              <CardDescription>{progress.message}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={(progress.current / progress.total) * 100} className="h-3" />
              <div className="text-center text-sm text-muted-foreground">
                {progress.current} of {progress.total}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Breadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Contact Collection" }]} />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="border-border/50 bg-card/50 backdrop-blur shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
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
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? Math.round((stats.active/stats.total)*100) : 0}% active
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Largest Group</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.largestGroup?.contact_count || 0}</div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {stats.largestGroup?.name || 'N/A'}
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
            <Dialog open={dialogs.import} onOpenChange={(open) => open ? openDialog('import') : closeDialog('import')}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Upload className="h-4 w-4" />
                  Import
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[90vw] max-w-4xl h-[90vh] flex flex-col p-0 sm:max-h-[80vh]">
                <DialogHeader className="p-6 pb-4">
                  <DialogTitle className="text-2xl">Import Contacts</DialogTitle>
                  <DialogDescription>Upload CSV, XLSX, or XLS file to import contacts</DialogDescription>
                </DialogHeader>
                
                <div className="flex-grow overflow-hidden flex flex-col px-6 pb-6 min-h-0">
                  {!importState.contacts.length && !importState.processing && !importState.error && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 border-2 border-dashed rounded-lg">
                      <Inbox className="h-16 w-16 text-muted-foreground" />
                      <h3 className="mt-4 text-xl font-semibold">Upload a contact file</h3>
                      <p className="mt-1 text-muted-foreground">Select a CSV, XLSX or XLS file to begin.</p>
                      <Input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept=".csv,.xlsx,.xls" />
                      <Button className="mt-6" onClick={() => fileInputRef.current?.click()}>
                        <FileUp className="mr-2 h-4 w-4" />
                        Select File
                      </Button>
                    </div>
                  )}

                  {importState.processing && (
                    <div className="flex flex-col items-center justify-center h-full">
                      <Loader2 className="h-16 w-16 animate-spin text-primary" />
                      <p className="mt-4 text-muted-foreground">Parsing your file and extracting contacts...</p>
                    </div>
                  )}

                  {importState.error && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-destructive">
                      <AlertCircle className="h-16 w-16" />
                      <p className="mt-4 font-semibold">An error occurred</p>
                      <p className="text-sm">{importState.error}</p>
                      <Button variant="outline" className="mt-6" onClick={() => fileInputRef.current?.click()}>
                        Try Another File
                      </Button>
                    </div>
                  )}

                  {importState.contacts.length > 0 && !importState.processing && (
                    <div className="h-full flex flex-col min-h-0">
                      <p className="text-sm text-muted-foreground mb-2 flex-shrink-0">
                        Found {importState.contacts.length} contacts. Review and edit before importing.
                      </p>
                      <ScrollArea className="flex-grow rounded-md border">
                        <Table>
                          <TableHeader className="sticky top-0 bg-secondary z-10">
                            <TableRow>
                              <TableHead className="w-[50%]">Name</TableHead>
                              <TableHead>Phone Number</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {importState.contacts.map((contact, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <Input
                                    value={contact.name || ""}
                                    onChange={(e) => updateContactName(index, e.target.value)}
                                    placeholder="No name found"
                                    className="h-8 bg-transparent border-0 focus-visible:ring-1"
                                  />
                                </TableCell>
                                <TableCell className="font-mono text-sm">{contact.phone_number || "N/A"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  )}
                </div>
                
                {importState.contacts.length > 0 && !importState.processing && (
                  <DialogFooter className="bg-background border-t p-4 sm:p-6 flex-wrap justify-between">
                    <div className="flex items-center gap-2 w-full sm:w-1/2">
                      <Users className="h-5 w-5 text-muted-foreground flex-shrink-0"/>
                      <Select value={importState.groupId} onValueChange={(val) => setImportState(prev => ({ ...prev, groupId: val }))}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select Group" />
                        </SelectTrigger>
                        <SelectContent>
                          {groups.map(g => (
                            <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 justify-end w-full sm:w-auto mt-2 sm:mt-0">
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Change File</Button>
                      <Button variant="outline" onClick={() => closeDialog('import')}>Cancel</Button>
                      <Button onClick={handleImportContacts} disabled={!importState.groupId || loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Import {importState.contacts.length}
                      </Button>
                    </div>
                  </DialogFooter>
                )}
              </DialogContent>
            </Dialog>

            <Dialog open={dialogs.addContact} onOpenChange={(open) => open ? openDialog('addContact') : closeDialog('addContact')}>
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
                      <Label>First Name *</Label>
                      <Input value={forms.contact.firstName} onChange={(e) => setForms(prev => ({ ...prev, contact: { ...prev.contact, firstName: e.target.value }}))} placeholder="John" />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input value={forms.contact.lastName} onChange={(e) => setForms(prev => ({ ...prev, contact: { ...prev.contact, lastName: e.target.value }}))} placeholder="Doe" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number *</Label>
                    <Input value={forms.contact.phone} onChange={(e) => setForms(prev => ({ ...prev, contact: { ...prev.contact, phone: e.target.value }}))} placeholder="0708215305" />
                    <p className="text-xs text-muted-foreground">Auto-formats to +256</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={forms.contact.email} onChange={(e) => setForms(prev => ({ ...prev, contact: { ...prev.contact, email: e.target.value }}))} placeholder="john@example.com" type="email" />
                  </div>
                  <div className="space-y-2">
                    <Label>Group *</Label>
                    <Select value={forms.contact.groupId} onValueChange={(val) => setForms(prev => ({ ...prev, contact: { ...prev.contact, groupId: val }}))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a group" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map(g => (
                          <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => closeDialog('addContact')}>Cancel</Button>
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
                <Dialog open={dialogs.createGroup} onOpenChange={(open) => open ? openDialog('createGroup') : closeDialog('createGroup')}>
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
                        <Label>Group Name *</Label>
                        <Input value={forms.createGroup.name} onChange={(e) => setForms(prev => ({ ...prev, createGroup: { ...prev.createGroup, name: e.target.value }}))} placeholder="e.g., VIP Customers" />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea value={forms.createGroup.description} onChange={(e) => setForms(prev => ({ ...prev, createGroup: { ...prev.createGroup, description: e.target.value }}))} placeholder="Brief description..." rows={3} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => closeDialog('createGroup')}>Cancel</Button>
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
                  <Input placeholder="Search groups..." className="pl-9 bg-background/50 shadow-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : !filteredGroups.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No groups found</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredGroups.map(group => (
                    <Card key={group.id} className="border-border/50 shadow-none bg-background/50 hover:bg-background/80 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <CardTitle className="text-base">{group.name}</CardTitle>
                            <CardDescription className="text-xs">{group.description || "No description"}</CardDescription>
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
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete('group', group)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Group & Contacts
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Contacts</span>
                          <Badge variant="secondary" className="font-mono">{group.contact_count || 0}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Created</span>
                          <span className="text-xs">{new Date(group.created_at).toLocaleDateString()}</span>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>All Contacts</CardTitle>
                  <CardDescription>View and manage your contacts</CardDescription>
                </div>
                {selectedContacts.size > 0 && (
                  <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete {selectedContacts.size} Selected
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search contacts..." className="pl-9 bg-background/50" value={contactSearchQuery} onChange={(e) => setContactSearchQuery(e.target.value)} />
                </div>
                
                {filteredContacts.length > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                    <Checkbox checked={selectAllChecked} onCheckedChange={toggleSelectAll} />
                    <Label className="text-sm cursor-pointer" onClick={toggleSelectAll}>
                      Select all ({filteredContacts.length} contacts)
                    </Label>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : !filteredContacts.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No contacts found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredContacts.map(contact => (
                    <Card key={contact.id} className={`border-border/50 shadow-none bg-background/50 hover:bg-background/80 transition-colors ${selectedContacts.has(contact.id) ? 'ring-2 ring-primary' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox checked={selectedContacts.has(contact.id)} onCheckedChange={() => toggleContactSelection(contact.id)} className="mt-1" />
                          
                          <div className="flex items-start justify-between flex-1 min-w-0">
                            <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                              <Avatar className="h-10 w-10 md:h-12 md:w-12 flex-shrink-0">
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {(contact.name || "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>

                              <div className="flex-1 space-y-2 md:space-y-3 min-w-0">
                                <div>
                                  <h3 className="font-semibold text-sm md:text-base truncate">{contact.name || "Unknown"}</h3>
                                  <p className="text-xs md:text-sm text-muted-foreground">ID: {contact.id}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm">
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                                    <span className="truncate">{contact.phone_number || "N/A"}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                                    <span className="truncate">{contact.email || "No email"}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                                    <span className="text-muted-foreground">{new Date(contact.created_at).toLocaleDateString()}</span>
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
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditContactDialog(contact)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Contact
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete('contact', contact)}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Contact
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
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

      <Dialog open={dialogs.editGroup} onOpenChange={(open) => open ? openDialog('editGroup') : closeDialog('editGroup')}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>Update group information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Group Name *</Label>
              <Input value={forms.editGroup.name} onChange={(e) => setForms(prev => ({ ...prev, editGroup: { ...prev.editGroup, name: e.target.value }}))} placeholder="e.g., VIP Customers" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={forms.editGroup.description} onChange={(e) => setForms(prev => ({ ...prev, editGroup: { ...prev.editGroup, description: e.target.value }}))} placeholder="Brief description..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => closeDialog('editGroup')}>Cancel</Button>
            <Button onClick={handleEditGroup} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogs.editContact} onOpenChange={(open) => open ? openDialog('editContact') : closeDialog('editContact')}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>Update contact information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input value={forms.contact.firstName} onChange={(e) => setForms(prev => ({ ...prev, contact: { ...prev.contact, firstName: e.target.value }}))} placeholder="John" />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={forms.contact.lastName} onChange={(e) => setForms(prev => ({ ...prev, contact: { ...prev.contact, lastName: e.target.value }}))} placeholder="Doe" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input value={forms.contact.phone} onChange={(e) => setForms(prev => ({ ...prev, contact: { ...prev.contact, phone: e.target.value }}))} placeholder="0708215305" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={forms.contact.email} onChange={(e) => setForms(prev => ({ ...prev, contact: { ...prev.contact, email: e.target.value }}))} placeholder="john@example.com" type="email" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => closeDialog('editContact')}>Cancel</Button>
            <Button onClick={handleEditContact} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogs.viewGroupContacts} onOpenChange={(open) => open ? openDialog('viewGroupContacts') : closeDialog('viewGroupContacts')}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {selectedGroupForView?.name || "Group"} Contacts
            </DialogTitle>
            <DialogDescription>Manage contacts in this group ({groupContacts.length} contacts)</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loadingGroupContacts ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !groupContacts.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No contacts in this group</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {groupContacts.map(contact => (
                  <Card key={contact.id} className="border-border/50 bg-background/50 shadow-none">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {(contact.name || "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{contact.name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground truncate">{contact.phone_number || "N/A"}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => selectedGroupForView && handleRemoveFromGroup(selectedGroupForView.id, contact.id)}>
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
            <Button variant="outline" onClick={() => closeDialog('viewGroupContacts')}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}