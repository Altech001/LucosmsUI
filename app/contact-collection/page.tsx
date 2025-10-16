"use client"

import { Breadcrumb } from "@/components/breadcrumb"
import { PageLayout } from "@/components/page-layout"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Progress } from "@/components/ui/progress"
import {
  Calendar,
  Edit,
  FileSpreadsheet,
  FolderOpen,
  Mail,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Trash2,
  Upload,
  UserPlus,
  Loader2,
  Users,
  AlertCircle,
  CheckCircle2,
  X,
  RefreshCw
} from "lucide-react"
import { useState, useEffect, ChangeEvent } from "react"
import { useToast } from "@/contexts/toast-context"
import { useAuth } from "@clerk/nextjs"
import * as XLSX from 'xlsx'

const API_BASE_URL = "https://luco-backend.onrender.com/api/v1"

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

interface ExtractionProgress {
  isExtracting: boolean
  currentRow: number
  totalRows: number
  extractedContacts: ContactToImport[]
  errors: string[]
}

interface DeleteProgress {
  isDeleting: boolean
  current: number
  total: number
  message: string
}

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

const extractPhoneNumbers = (text: string): string[] => {
  const phoneRegex = /(?:\+?256|0)?[7][0-9]{8}/g
  const matches = text.match(phoneRegex) || []
  return [...new Set(matches.map(formatPhoneNumberUG))]
}

const parseFile = async (file: File): Promise<ContactToImport[]> => {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension === 'csv') {
    return parseCSV(file)
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcel(file)
  } else {
    throw new Error('Unsupported file format')
  }
}

const parseCSV = async (file: File): Promise<ContactToImport[]> => {
  const text = await file.text()
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []
  const contacts: ContactToImport[] = []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    let name = '', phone = '', email = ''
    headers.forEach((header, index) => {
      const value = values[index] || ''
      if (header.includes('name')) name = value
      else if (header.includes('phone') || header.includes('mobile') || header.includes('number')) {
        phone = value
      } else if (header.includes('email')) email = value
    })
    if (!phone) {
      const allText = values.join(' ')
      const phones = extractPhoneNumbers(allText)
      if (phones.length > 0) phone = phones[0]
    }
    if (!name && phone) {
      name = `Contact ${i}`
    }
    if (phone) {
      contacts.push({
        name: name || `Contact ${i}`,
        phone_number: formatPhoneNumberUG(phone),
        email: email || undefined
      })
    }
  }
  return contacts
}

const parseExcel = async (file: File): Promise<ContactToImport[]> => {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
  if (jsonData.length === 0) return []
  const contacts: ContactToImport[] = []
  const headers = jsonData[0].map((h: any) => String(h || '').toLowerCase())
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i]
    let name = '', phone = '', email = ''
    headers.forEach((header, index) => {
      const value = String(row[index] || '').trim()
      if (header.includes('name')) name = value
      else if (header.includes('phone') || header.includes('mobile') || header.includes('number')) {
        phone = value
      } else if (header.includes('email')) email = value
    })
    if (!phone) {
      const allText = row.map(cell => String(cell || '')).join(' ')
      const phones = extractPhoneNumbers(allText)
      if (phones.length > 0) phone = phones[0]
    }
    if (!name && phone) {
      name = `Contact ${i}`
    }
    if (phone) {
      contacts.push({
        name: name || `Contact ${i}`,
        phone_number: formatPhoneNumberUG(phone),
        email: email || undefined
      })
    }
  }
  return contacts
}

export default function ContactCollectionPage() {
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [contactSearchQuery, setContactSearchQuery] = useState<string>("")
  const [activeTab, setActiveTab] = useState<string>("groups")
  const [groups, setGroups] = useState<Group[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set())
  const [selectAllChecked, setSelectAllChecked] = useState<boolean>(false)
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState<boolean>(false)
  const [isEditGroupOpen, setIsEditGroupOpen] = useState<boolean>(false)
  const [isAddContactOpen, setIsAddContactOpen] = useState<boolean>(false)
  const [isEditContactOpen, setIsEditContactOpen] = useState<boolean>(false)
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false)
  const [isViewGroupContactsOpen, setIsViewGroupContactsOpen] = useState<boolean>(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importGroupId, setImportGroupId] = useState<string>("")
  const [selectedGroupForView, setSelectedGroupForView] = useState<Group | null>(null)
  const [groupContacts, setGroupContacts] = useState<Contact[]>([])
  const [loadingGroupContacts, setLoadingGroupContacts] = useState<boolean>(false)
  const { showToast } = useToast()
  const [extractionProgress, setExtractionProgress] = useState<ExtractionProgress>({
    isExtracting: false,
    currentRow: 0,
    totalRows: 0,
    extractedContacts: [],
    errors: []
  })
  const [deleteProgress, setDeleteProgress] = useState<DeleteProgress>({
    isDeleting: false,
    current: 0,
    total: 0,
    message: ''
  })
  const [createGroupForm, setCreateGroupForm] = useState<GroupFormData>({ name: "", description: "" })
  const [editGroupForm, setEditGroupForm] = useState<GroupFormData>({ name: "", description: "" })
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [contactForm, setContactForm] = useState<ContactFormData>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    groupId: ""
  })
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const { getToken } = useAuth()

  const reloadData = () => {
    fetchGroups()
    fetchContacts()
  }

  const fetchGroups = async (retries = 3): Promise<void> => {
    for (let i = 0; i < retries; i++) {
      try {
        setLoading(true)
        await new Promise(resolve => setTimeout(resolve, 500))
        const token = await getToken()
        if (!token) {
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            continue
          }
          showToast("Error", "Authentication required", "error")
          return
        }
        const response = await fetch(`${API_BASE_URL}/groups/?skip=0&limit=100`, {
          headers: { 
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
        if (!response.ok) {
          throw new Error(`Failed to fetch groups: ${response.status}`)
        }
        const data: Group[] = await response.json()
        const groupsWithDetails = await Promise.all(
          data.map(async (group: Group): Promise<Group> => {
            try {
              const detailResponse = await fetch(`${API_BASE_URL}/groups/${group.id}`, {
                headers: { 
                  'accept': 'application/json',
                  'Authorization': `Bearer ${token}`
                }
              })
              if (!detailResponse.ok) {
                return { ...group, contact_count: 0 }
              }
              const details: Group & { contact_count: number } = await detailResponse.json()
              return { ...group, contact_count: details.contact_count || 0 }
            } catch (err) {
              return { ...group, contact_count: 0 }
            }
          })
        )
        setGroups(groupsWithDetails)
        break
      } catch (error) {
        if (i === retries - 1) {
          showToast("Error", "Failed to fetch groups", "error")
        }
      } finally {
        setLoading(false)
      }
    }
  }

  const fetchContacts = async (retries = 3): Promise<void> => {
    for (let i = 0; i < retries; i++) {
      try {
        setLoading(true)
        await new Promise(resolve => setTimeout(resolve, 500))
        const token = await getToken()
        if (!token) {
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            continue
          }
          showToast("Error", "Authentication required", "error")
          return
        }
        const response = await fetch(`${API_BASE_URL}/contacts/?skip=0&limit=100&is_active=true`, {
          headers: { 
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
        if (!response.ok) {
          throw new Error(`Failed to fetch contacts: ${response.status}`)
        }
        const data: Contact[] = await response.json()
        setContacts(data || [])
        break
      } catch (error) {
        if (i === retries - 1) {
          showToast("Error", "Failed to fetch contacts", "error")
        }
      } finally {
        setLoading(false)
      }
    }
  }

  const fetchGroupContacts = async (groupId: number, retries = 3): Promise<void> => {
    for (let i = 0; i < retries; i++) {
      try {
        setLoadingGroupContacts(true)
        await new Promise(resolve => setTimeout(resolve, 500))
        const token = await getToken()
        if (!token) {
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            continue
          }
          return
        }
        const response = await fetch(`${API_BASE_URL}/groups/${groupId}/contacts?skip=0&limit=100`, {
          headers: { 
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
        if (!response.ok) {
          throw new Error(`Failed to fetch group contacts`)
        }
        const data: Contact[] = await response.json()
        setGroupContacts(data || [])
        break
      } catch (error) {
        if (i === retries - 1) {
          showToast("Error", "Failed to fetch group contacts", "error")
        }
      } finally {
        setLoadingGroupContacts(false)
      }
    }
  }

  const handleCreateGroup = async (): Promise<void> => {
    if (!createGroupForm.name) {
      showToast("Validation Error", "Group name is required", "warning")
      return
    }
    try {
      setLoading(true)
      const token = await getToken()
      if (!token) {
        showToast("Error", "Authentication required", "error")
        return
      }
      const response = await fetch(`${API_BASE_URL}/groups/`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: createGroupForm.name,
          description: createGroupForm.description || ""
        })
      })
      if (response.ok) {
        showToast("Success", "Group created successfully", "success")
        setIsCreateGroupOpen(false)
        setTimeout(() => {
          setCreateGroupForm({ name: "", description: "" })
          reloadData()
        }, 300)
      } else {
        const error: { detail?: string } = await response.json()
        throw new Error(error.detail || "Failed to create group")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create group"
      showToast("Error", errorMessage, "error")
    } finally {
      setLoading(false)
    }
  }

  const handleEditGroup = async (): Promise<void> => {
    if (!editGroupForm.name || !editingGroup) {
      showToast("Validation Error", "Group name is required", "warning")
      return
    }
    try {
      setLoading(true)
      const token = await getToken()
      if (!token) {
        showToast("Error", "Authentication required", "error")
        return
      }
      const response = await fetch(`${API_BASE_URL}/groups/${editingGroup.id}`, {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editGroupForm.name,
          description: editGroupForm.description || ""
        })
      })
      if (response.ok) {
        showToast("Success", "Group updated successfully", "success")
        setIsEditGroupOpen(false)
        setTimeout(() => {
          setEditingGroup(null)
          setEditGroupForm({ name: "", description: "" })
          reloadData()
        }, 300)
      } else {
        throw new Error("Failed to update group")
      }
    } catch (error) {
      showToast("Error", "Failed to update group", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleAddContact = async (): Promise<void> => {
    if (!contactForm.firstName || !contactForm.phone || !contactForm.groupId) {
      showToast("Validation Error", "Name, phone, and group are required", "warning")
      return
    }
    try {
      setLoading(true)
      const token = await getToken()
      if (!token) {
        showToast("Error", "Authentication required", "error")
        return
      }
      const formattedPhone = formatPhoneNumberUG(contactForm.phone)
      const fullName = `${contactForm.firstName} ${contactForm.lastName}`.trim()
      const response = await fetch(`${API_BASE_URL}/contacts/`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phone_number: formattedPhone,
          name: fullName,
          email: contactForm.email || ""
        })
      })
      if (response.ok) {
        const newContact: Contact = await response.json()
        const groupResponse = await fetch(`${API_BASE_URL}/groups/${contactForm.groupId}/contacts`, {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            contact_ids: [newContact.id]
          })
        })
        if (groupResponse.ok) {
          showToast("Success", "Contact added successfully", "success")
          setIsAddContactOpen(false)
          setTimeout(() => {
            setContactForm({ firstName: "", lastName: "", phone: "", email: "", groupId: "" })
            reloadData()
          }, 300)
        } else {
          throw new Error("Failed to add contact to group")
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || "Failed to add contact")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add contact"
      showToast("Error", errorMessage, "error")
    } finally {
      setLoading(false)
    }
  }

  const handleEditContact = async (): Promise<void> => {
    if (!contactForm.firstName || !contactForm.phone || !editingContact) {
      showToast("Validation Error", "Name and phone are required", "warning")
      return
    }
    try {
      setLoading(true)
      const token = await getToken()
      if (!token) {
        showToast("Error", "Authentication required", "error")
        return
      }
      const formattedPhone = formatPhoneNumberUG(contactForm.phone)
      const fullName = `${contactForm.firstName} ${contactForm.lastName}`.trim()
      const response = await fetch(`${API_BASE_URL}/contacts/${editingContact.id}`, {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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
        setTimeout(() => {
          setEditingContact(null)
          setContactForm({ firstName: "", lastName: "", phone: "", email: "", groupId: "" })
          reloadData()
        }, 300)
      } else {
        throw new Error("Failed to update contact")
      }
    } catch (error) {
      showToast("Error", "Failed to update contact", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setExtractionProgress({
      isExtracting: true,
      currentRow: 0,
      totalRows: 0,
      extractedContacts: [],
      errors: []
    })
    try {
      const contacts = await parseFile(file)
      setExtractionProgress({
        isExtracting: false,
        currentRow: contacts.length,
        totalRows: contacts.length,
        extractedContacts: contacts,
        errors: contacts.length === 0 ? ['No valid contacts found'] : []
      })
      if (contacts.length > 0) {
        showToast("Success", `Extracted ${contacts.length} contacts`, "success")
      } else {
        showToast("Warning", "No contacts found in file", "warning")
      }
    } catch (error) {
      setExtractionProgress({
        isExtracting: false,
        currentRow: 0,
        totalRows: 0,
        extractedContacts: [],
        errors: [error instanceof Error ? error.message : 'Failed to parse file']
      })
      showToast("Error", "Failed to extract contacts", "error")
    }
  }

  const handleClearFile = () => {
    setSelectedFile(null)
    setExtractionProgress({
      isExtracting: false,
      currentRow: 0,
      totalRows: 0,
      extractedContacts: [],
      errors: []
    })
  }

  const handleImportContacts = async (): Promise<void> => {
    if (extractionProgress.extractedContacts.length === 0 || !importGroupId) {
      showToast("Validation Error", "Please select a file and group", "warning")
      return
    }
    try {
      setLoading(true)
      const token = await getToken()
      if (!token) {
        showToast("Error", "Authentication required", "error")
        return
      }

      // Try bulk import first
      try {
        const bulkResponse = await fetch(`${API_BASE_URL}/contacts/bulk`, {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(extractionProgress.extractedContacts)
        })

        if (bulkResponse.ok) {
          const result: BulkImportResponse = await bulkResponse.json()
          const allContactsResponse = await fetch(`${API_BASE_URL}/contacts/?skip=0&limit=1000&is_active=true`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const allContacts: Contact[] = await allContactsResponse.json()
          const newContactIds = allContacts.slice(-result.created).map((c: Contact) => c.id)
          if (newContactIds.length > 0) {
            await fetch(`${API_BASE_URL}/groups/${importGroupId}/contacts`, {
              method: 'POST',
              headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ contact_ids: newContactIds })
            })
          }
          showToast("Success", `Imported ${result.created} contacts successfully`, "success")
          setIsImportOpen(false)
          setTimeout(() => {
            setSelectedFile(null)
            setImportGroupId("")
            setExtractionProgress({
              isExtracting: false,
              currentRow: 0,
              totalRows: 0,
              extractedContacts: [],
              errors: []
            })
            reloadData()
          }, 300)
          return
        }
      } catch (bulkError) {
        console.log("Bulk import failed, falling back to sequential import:", bulkError)
      }

      // Fallback: Sequential import with progress
      showToast("Info", "Using sequential import (bulk endpoint unavailable)", "warning")
      
      setDeleteProgress({
        isDeleting: true,
        current: 0,
        total: extractionProgress.extractedContacts.length,
        message: 'Starting import...'
      })

      const createdContactIds: number[] = []
      let successCount = 0
      let errorCount = 0

      for (let i = 0; i < extractionProgress.extractedContacts.length; i++) {
        const contact = extractionProgress.extractedContacts[i]
        
        setDeleteProgress({
          isDeleting: true,
          current: i + 1,
          total: extractionProgress.extractedContacts.length,
          message: `Importing contact ${i + 1} of ${extractionProgress.extractedContacts.length}...`
        })

        try {
          const response = await fetch(`${API_BASE_URL}/contacts/`, {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(contact)
          })

          if (response.ok) {
            const newContact: Contact = await response.json()
            createdContactIds.push(newContact.id)
            successCount++
          } else {
            errorCount++
          }
        } catch (error) {
          errorCount++
        }

        await new Promise(resolve => setTimeout(resolve, 50))
      }

      // Add all created contacts to the group
      if (createdContactIds.length > 0) {
        setDeleteProgress({
          isDeleting: true,
          current: extractionProgress.extractedContacts.length,
          total: extractionProgress.extractedContacts.length,
          message: 'Adding contacts to group...'
        })

        await fetch(`${API_BASE_URL}/groups/${importGroupId}/contacts`, {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ contact_ids: createdContactIds })
        })
      }

      setDeleteProgress({
        isDeleting: false,
        current: 0,
        total: 0,
        message: ''
      })

      showToast(
        "Success", 
        `Imported ${successCount} contacts${errorCount > 0 ? ` (${errorCount} skipped)` : ''}`, 
        "success"
      )
      
      setIsImportOpen(false)
      setTimeout(() => {
        setSelectedFile(null)
        setImportGroupId("")
        setExtractionProgress({
          isExtracting: false,
          currentRow: 0,
          totalRows: 0,
          extractedContacts: [],
          errors: []
        })
        reloadData()
      }, 300)

    } catch (error) {
      showToast("Error", "Failed to import contacts", "error")
    } finally {
      setLoading(false)
      setDeleteProgress({
        isDeleting: false,
        current: 0,
        total: 0,
        message: ''
      })
    }
  }

  const handleDeleteGroupWithContacts = async (group: Group): Promise<void> => {
    const contactCount = group.contact_count || 0
    const message = contactCount > 0 
      ? `Delete "${group.name}" and all ${contactCount} contacts in it? This cannot be undone.`
      : `Delete "${group.name}"? This cannot be undone.`
    if (!window.confirm(message)) {
      return
    }
    try {
      const token = await getToken()
      if (!token) {
        showToast("Error", "Authentication required", "error")
        return
      }
      setDeleteProgress({
        isDeleting: true,
        current: 0,
        total: contactCount + 1,
        message: 'Fetching group contacts...'
      })
      const contactsResponse = await fetch(`${API_BASE_URL}/groups/${group.id}/contacts?skip=0&limit=1000`, {
        headers: { 
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      if (contactsResponse.ok) {
        const groupContacts: Contact[] = await contactsResponse.json()
        for (let i = 0; i < groupContacts.length; i++) {
          setDeleteProgress({
            isDeleting: true,
            current: i + 1,
            total: contactCount + 1,
            message: `Deleting contact ${i + 1} of ${contactCount}...`
          })
          await fetch(`${API_BASE_URL}/contacts/${groupContacts[i].id}`, {
            method: 'DELETE',
            headers: { 
              'accept': '*/*',
              'Authorization': `Bearer ${token}`
            }
          })
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      setDeleteProgress({
        isDeleting: true,
        current: contactCount,
        total: contactCount + 1,
        message: 'Deleting group...'
      })
      const response = await fetch(`${API_BASE_URL}/groups/${group.id}`, {
        method: 'DELETE',
        headers: { 
          'accept': '*/*',
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        showToast("Success", "Group and contacts deleted successfully", "success")
        reloadData()
      } else {
        throw new Error("Failed to delete group")
      }
    } catch (error) {
      showToast("Error", "Failed to delete group", "error")
    } finally {
      setDeleteProgress({
        isDeleting: false,
        current: 0,
        total: 0,
        message: ''
      })
    }
  }

  const handleDeleteContact = async (contact: Contact): Promise<void> => {
    if (!window.confirm(`Delete "${contact.name}"? This cannot be undone.`)) {
      return
    }
    try {
      setDeleteProgress({
        isDeleting: true,
        current: 1,
        total: 1,
        message: 'Deleting contact...'
      })
      const token = await getToken()
      if (!token) {
        showToast("Error", "Authentication required", "error")
        return
      }
      const response = await fetch(`${API_BASE_URL}/contacts/${contact.id}`, {
        method: 'DELETE',
        headers: { 
          'accept': '*/*',
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        showToast("Success", "Contact deleted successfully", "success")
        reloadData()
        if (isViewGroupContactsOpen && selectedGroupForView) {
          fetchGroupContacts(selectedGroupForView.id)
        }
      } else {
        throw new Error("Failed to delete contact")
      }
    } catch (error) {
      showToast("Error", "Failed to delete contact", "error")
    } finally {
      setDeleteProgress({
        isDeleting: false,
        current: 0,
        total: 0,
        message: ''
      })
    }
  }

  const handleBulkDelete = async (): Promise<void> => {
    const selectedCount = selectedContacts.size
    if (selectedCount === 0) {
      showToast("Warning", "No contacts selected", "warning")
      return
    }
    if (!window.confirm(`Delete ${selectedCount} selected contacts? This cannot be undone.`)) {
      return
    }
    try {
      const token = await getToken()
      if (!token) {
        showToast("Error", "Authentication required", "error")
        return
      }
      const contactIds = Array.from(selectedContacts)
      setDeleteProgress({
        isDeleting: true,
        current: 0,
        total: contactIds.length,
        message: 'Starting bulk delete...'
      })
      for (let i = 0; i < contactIds.length; i++) {
        setDeleteProgress({
          isDeleting: true,
          current: i + 1,
          total: contactIds.length,
          message: `Deleting contact ${i + 1} of ${contactIds.length}...`
        })
        await fetch(`${API_BASE_URL}/contacts/${contactIds[i]}`, {
          method: 'DELETE',
          headers: { 
            'accept': '*/*',
            'Authorization': `Bearer ${token}`
          }
        })
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      showToast("Success", `${contactIds.length} contacts deleted successfully`, "success")
      setSelectedContacts(new Set())
      setSelectAllChecked(false)
      reloadData()
    } catch (error) {
      showToast("Error", "Failed to delete contacts", "error")
    } finally {
      setDeleteProgress({
        isDeleting: false,
        current: 0,
        total: 0,
        message: ''
      })
    }
  }

  const toggleContactSelection = (contactId: number) => {
    const newSelected = new Set(selectedContacts)
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId)
    } else {
      newSelected.add(contactId)
    }
    setSelectedContacts(newSelected)
  }

  const toggleSelectAll = () => {
    const filtered = contacts.filter((contact: Contact) => {
      const matchesSearch = 
        (contact.name || "").toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
        (contact.phone_number || "").includes(contactSearchQuery) ||
        (contact.email || "").toLowerCase().includes(contactSearchQuery.toLowerCase())
      return matchesSearch
    })
    
    if (selectAllChecked) {
      setSelectedContacts(new Set())
      setSelectAllChecked(false)
    } else {
      setSelectedContacts(new Set(filtered.map(c => c.id)))
      setSelectAllChecked(true)
    }
  }

  const handleRemoveFromGroup = async (groupId: number, contactId: number): Promise<void> => {
    if (!window.confirm("Remove this contact from the group?")) {
      return
    }
    try {
      setDeleteProgress({
        isDeleting: true,
        current: 1,
        total: 1,
        message: 'Removing contact from group...'
      })
      const token = await getToken()
      if (!token) {
        showToast("Error", "Authentication required", "error")
        return
      }
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}/contacts/${contactId}`, {
        method: 'DELETE',
        headers: { 
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        showToast("Success", "Contact removed from group", "success")
        fetchGroupContacts(groupId)
        reloadData()
      } else {
        throw new Error("Failed to remove contact from group")
      }
    } catch (error) {
      showToast("Error", "Failed to remove contact from group", "error")
    } finally {
      setDeleteProgress({
        isDeleting: false,
        current: 0,
        total: 0,
        message: ''
      })
    }
  }

  const openEditGroupDialog = (group: Group): void => {
    setEditingGroup(group)
    setEditGroupForm({
      name: group.name || "",
      description: group.description || ""
    })
    setIsEditGroupOpen(true)
  }

  const openViewGroupContactsDialog = (group: Group): void => {
    setSelectedGroupForView(group)
    setIsViewGroupContactsOpen(true)
    fetchGroupContacts(group.id)
  }

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

  useEffect(() => {
    const filtered = contacts.filter((contact: Contact) => {
      const matchesSearch = 
        (contact.name || "").toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
        (contact.phone_number || "").includes(contactSearchQuery) ||
        (contact.email || "").toLowerCase().includes(contactSearchQuery.toLowerCase())
      return matchesSearch
    })
    
    if (filtered.length > 0) {
      setSelectAllChecked(selectedContacts.size === filtered.length)
    } else {
      setSelectAllChecked(false)
    }
  }, [selectedContacts, contacts, contactSearchQuery])

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
      {deleteProgress.isDeleting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Deleting...
              </CardTitle>
              <CardDescription>{deleteProgress.message}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress 
                value={(deleteProgress.current / deleteProgress.total) * 100} 
                className="h-3"
              />
              <div className="text-center text-sm text-muted-foreground">
                {deleteProgress.current} of {deleteProgress.total}
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
            <Dialog open={isImportOpen} onOpenChange={(open) => {
              setIsImportOpen(open)
              if (!open) {
                setTimeout(() => {
                  handleClearFile()
                  setImportGroupId("")
                  reloadData()
                }, 300)
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Upload className="h-4 w-4" />
                  Import
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Import Contacts</DialogTitle>
                  <DialogDescription>
                    Upload CSV, XLSX, or XLS file to import contacts
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
                    {!selectedFile ? (
                      <div className="border-2 border-dashed border-border rounded-lg p-6 md:p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                        <FileSpreadsheet className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 md:mb-3 text-muted-foreground" />
                        <p className="text-sm font-medium mb-1">
                          Click to select file
                        </p>
                        <p className="text-xs text-muted-foreground mb-2 md:mb-3">
                          CSV, XLSX, or XLS format
                        </p>
                        <Input 
                          type="file" 
                          accept=".csv,.xlsx,.xls" 
                          className="hidden" 
                          id="file-upload" 
                          onChange={handleFileUpload} 
                        />
                        <Label htmlFor="file-upload" className="cursor-pointer">
                          <Button variant="outline" className="mt-1" asChild>
                            <span>Browse Files</span>
                          </Button>
                        </Label>
                      </div>
                    ) : (
                      <div className="border-2 border-primary/50 rounded-lg p-4 bg-primary/5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileSpreadsheet className="h-8 w-8 text-primary flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(selectedFile.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearFile}
                            className="flex-shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input 
                          type="file" 
                          accept=".csv,.xlsx,.xls" 
                          className="hidden" 
                          id="file-upload-change" 
                          onChange={handleFileUpload} 
                        />
                        <Label htmlFor="file-upload-change" className="cursor-pointer">
                          <Button variant="outline" size="sm" className="w-full" asChild>
                            <span>
                              <RefreshCw className="h-3 w-3 mr-2" />
                              Change File
                            </span>
                          </Button>
                        </Label>
                      </div>
                    )}
                  </div>

                  {extractionProgress.isExtracting && (
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            <p className="text-sm font-medium text-blue-900">Extracting contacts...</p>
                          </div>
                          <Progress value={50} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {!extractionProgress.isExtracting && extractionProgress.extractedContacts.length > 0 && (
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <p className="text-sm font-medium text-green-900">
                              {extractionProgress.extractedContacts.length} contacts extracted
                            </p>
                          </div>
                          <div className="max-h-32 md:max-h-40 overflow-y-auto space-y-1 mt-3">
                            {extractionProgress.extractedContacts.slice(0, 5).map((contact, idx) => (
                              <div key={idx} className="text-xs bg-white p-2 rounded border border-green-200">
                                <div className="font-medium truncate">{contact.name}</div>
                                <div className="text-muted-foreground">{contact.phone_number}</div>
                              </div>
                            ))}
                            {extractionProgress.extractedContacts.length > 5 && (
                              <p className="text-xs text-green-700 pt-2">
                                +{extractionProgress.extractedContacts.length - 5} more contacts
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {!extractionProgress.isExtracting && extractionProgress.errors.length > 0 && (
                    <Card className="bg-red-50 border-red-200">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-red-900">Extraction failed</p>
                            {extractionProgress.errors.map((error, idx) => (
                              <p key={idx} className="text-xs text-red-700">{error}</p>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="bg-muted/50 rounded-lg p-3 md:p-4 space-y-2">
                    <p className="text-sm font-medium">Smart Extraction:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Automatically detects phone numbers in any format</li>
                      <li>• Works with organized or unorganized data</li>
                      <li>• Supports Uganda format (0708... or +2567...)</li>
                      <li>• Auto-generates names if missing</li>
                    </ul>
                  </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => setIsImportOpen(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleImportContacts} 
                    disabled={loading || extractionProgress.extractedContacts.length === 0 || !importGroupId}
                    className="w-full sm:w-auto"
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Import {extractionProgress.extractedContacts.length} Contacts
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddContactOpen} onOpenChange={(open) => {
              setIsAddContactOpen(open)
              if (!open) {
                setTimeout(() => {
                  setContactForm({ firstName: "", lastName: "", phone: "", email: "", groupId: "" })
                  reloadData()
                }, 300)
              }
            }}>
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
                <Dialog open={isCreateGroupOpen} onOpenChange={(open) => {
                  setIsCreateGroupOpen(open)
                  if (!open) {
                    setTimeout(() => {
                      setCreateGroupForm({ name: "", description: "" })
                      reloadData()
                    }, 300)
                  }
                }}>
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
                        <Label htmlFor="createGroupName">Group Name *</Label>
                        <Input 
                          id="createGroupName" 
                          placeholder="e.g., VIP Customers" 
                          value={createGroupForm.name}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setCreateGroupForm({...createGroupForm, name: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="createGroupDescription">Description</Label>
                        <Textarea 
                          id="createGroupDescription" 
                          placeholder="Brief description..." 
                          rows={3}
                          value={createGroupForm.description}
                          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setCreateGroupForm({...createGroupForm, description: e.target.value})}
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
                                onClick={() => handleDeleteGroupWithContacts(group)}
                              >
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>All Contacts</CardTitle>
                  <CardDescription>View and manage your contacts</CardDescription>
                </div>
                {selectedContacts.size > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleBulkDelete}
                    className="gap-2"
                  >
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
                  <Input 
                    placeholder="Search contacts..." 
                    className="pl-9 bg-background/50" 
                    value={contactSearchQuery}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setContactSearchQuery(e.target.value)}
                  />
                </div>
                
                {filteredContacts.length > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                    <Checkbox 
                      id="select-all"
                      checked={selectAllChecked}
                      onCheckedChange={toggleSelectAll}
                    />
                    <Label htmlFor="select-all" className="text-sm cursor-pointer">
                      Select all ({filteredContacts.length} contacts)
                    </Label>
                  </div>
                )}
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
                      className={`border-border/50 shadow-none bg-background/50 hover:bg-background/80 transition-colors ${
                        selectedContacts.has(contact.id) ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox 
                            checked={selectedContacts.has(contact.id)}
                            onCheckedChange={() => toggleContactSelection(contact.id)}
                            className="mt-1"
                          />
                          
                          <div className="flex items-start justify-between flex-1 min-w-0">
                            <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                              <Avatar className="h-10 w-10 md:h-12 md:w-12 flex-shrink-0">
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {(contact.name || "?")
                                    .split(" ")
                                    .map((n: string) => n[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2)}
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
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
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

      <Dialog open={isEditGroupOpen} onOpenChange={(open) => {
        setIsEditGroupOpen(open)
        if (!open) {
          setTimeout(() => {
            setEditingGroup(null)
            setEditGroupForm({ name: "", description: "" })
            reloadData()
          }, 300)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>Update group information</DialogDescription>
          </DialogHeader>
          {editingGroup && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editGroupName">Group Name *</Label>
                <Input 
                  id="editGroupName" 
                  placeholder="e.g., VIP Customers" 
                  value={editGroupForm.name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEditGroupForm({...editGroupForm, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editGroupDescription">Description</Label>
                <Textarea 
                  id="editGroupDescription" 
                  placeholder="Brief description..." 
                  rows={3}
                  value={editGroupForm.description}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEditGroupForm({...editGroupForm, description: e.target.value})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditGroupOpen(false)}>Cancel</Button>
            <Button onClick={handleEditGroup} disabled={loading || !editingGroup}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditContactOpen} onOpenChange={(open) => {
        setIsEditContactOpen(open)
        if (!open) {
          setTimeout(() => {
            setEditingContact(null)
            setContactForm({ firstName: "", lastName: "", phone: "", email: "", groupId: "" })
            reloadData()
          }, 300)
        }
      }}>
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

      <Dialog open={isViewGroupContactsOpen} onOpenChange={(open) => {
        setIsViewGroupContactsOpen(open)
        if (!open) {
          setTimeout(() => {
            setSelectedGroupForView(null)
            setGroupContacts([])
            reloadData()
          }, 300)
        }
      }}>
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