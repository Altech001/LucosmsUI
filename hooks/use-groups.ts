
import { useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useAppStore } from '@/stores/use-app-store'

export function useGroups() {
  const { getToken } = useAuth()
  const { groups, groupsCache, setGroups, isCacheValid } = useAppStore()

  const fetchGroups = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && isCacheValid(groupsCache)) {
      return { data: groups, fromCache: true }
    }

    try {
      const token = await getToken()
      if (!token) throw new Error('No authentication token')

      const response = await fetch(
        'https://luco-backend.onrender.com/api/v1/groups?skip=0&limit=100',
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`)

      const data = await response.json()
      setGroups(data)
      return { data, fromCache: false }
    } catch (error) {
      console.error('Error fetching groups:', error)
      throw error
    }
  }, [getToken, groupsCache, groups, isCacheValid, setGroups])

  return { groups, fetchGroups }
}
