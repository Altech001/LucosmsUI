
import { useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useAppStore } from '@/stores/use-app-store'

export function useContacts() {
  const { getToken } = useAuth()
  const { contacts, contactsCache, setContacts, isCacheValid } = useAppStore()

  const fetchContacts = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && isCacheValid(contactsCache)) {
      return { data: contacts, fromCache: true }
    }

    try {
      const token = await getToken()
      if (!token) throw new Error('No authentication token')

      const response = await fetch(
        'https://luco-backend.onrender.com/api/v1/contacts/list?skip=0&limit=1000',
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`)

      const data = await response.json()
      setContacts(data)
      return { data, fromCache: false }
    } catch (error) {
      console.error('Error fetching contacts:', error)
      throw error
    }
  }, [getToken, contactsCache, contacts, isCacheValid, setContacts])

  return { contacts, fetchContacts }
}
