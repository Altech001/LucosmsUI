
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface ApiKey {
  id: string
  key: string
  full_key: string
  is_active: boolean
  name?: string
  created?: string
  lastUsed?: string
  status: "active" | "inactive"
}

interface Contact {
  id: number
  name: string
  phone_number: string
  email?: string
  is_active: boolean
  group_id?: number
}

interface Group {
  id: number
  name: string
  description?: string
  contact_count?: number
  created_at?: string
}

interface WalletData {
  balance: number
  currency: string
  last_updated?: string
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

interface AppStore {
  // API Keys
  apiKeys: ApiKey[]
  apiKeysCache: CacheEntry<ApiKey[]> | null
  setApiKeys: (keys: ApiKey[]) => void
  
  // Contacts
  contacts: Contact[]
  contactsCache: CacheEntry<Contact[]> | null
  setContacts: (contacts: Contact[]) => void
  
  // Groups
  groups: Group[]
  groupsCache: CacheEntry<Group[]> | null
  setGroups: (groups: Group[]) => void
  
  // Wallet
  walletData: WalletData | null
  walletCache: CacheEntry<WalletData> | null
  setWalletData: (data: WalletData) => void
  
  // Cache utilities
  isCacheValid: (cache: CacheEntry<any> | null) => boolean
  clearCache: () => void
  clearExpiredCache: () => void
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      apiKeys: [],
      apiKeysCache: null,
      contacts: [],
      contactsCache: null,
      groups: [],
      groupsCache: null,
      walletData: null,
      walletCache: null,

      // API Keys
      setApiKeys: (keys) => {
        const now = Date.now()
        set({
          apiKeys: keys,
          apiKeysCache: {
            data: keys,
            timestamp: now,
            expiresAt: now + CACHE_TTL,
          },
        })
      },

      // Contacts
      setContacts: (contacts) => {
        const now = Date.now()
        set({
          contacts,
          contactsCache: {
            data: contacts,
            timestamp: now,
            expiresAt: now + CACHE_TTL,
          },
        })
      },

      // Groups
      setGroups: (groups) => {
        const now = Date.now()
        set({
          groups,
          groupsCache: {
            data: groups,
            timestamp: now,
            expiresAt: now + CACHE_TTL,
          },
        })
      },

      // Wallet
      setWalletData: (data) => {
        const now = Date.now()
        set({
          walletData: data,
          walletCache: {
            data,
            timestamp: now,
            expiresAt: now + CACHE_TTL,
          },
        })
      },

      // Cache utilities
      isCacheValid: (cache) => {
        if (!cache) return false
        const now = Date.now()
        return now < cache.expiresAt
      },

      clearCache: () => {
        set({
          apiKeysCache: null,
          contactsCache: null,
          groupsCache: null,
          walletCache: null,
        })
      },

      clearExpiredCache: () => {
        const state = get()
        const now = Date.now()
        const updates: Partial<AppStore> = {}

        if (state.apiKeysCache && now >= state.apiKeysCache.expiresAt) {
          updates.apiKeysCache = null
        }
        if (state.contactsCache && now >= state.contactsCache.expiresAt) {
          updates.contactsCache = null
        }
        if (state.groupsCache && now >= state.groupsCache.expiresAt) {
          updates.groupsCache = null
        }
        if (state.walletCache && now >= state.walletCache.expiresAt) {
          updates.walletCache = null
        }

        if (Object.keys(updates).length > 0) {
          set(updates)
        }
      },
    }),
    {
      name: 'luco-app-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        apiKeysCache: state.apiKeysCache,
        contactsCache: state.contactsCache,
        groupsCache: state.groupsCache,
        walletCache: state.walletCache,
      }),
    }
  )
)
