import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SearchHistoryEntry {
  username: string
  avatarUrl?: string
  highestRating: number | null
}

interface SearchHistoryState {
  history: SearchHistoryEntry[]
  addPlayer: (entry: SearchHistoryEntry) => void
  removePlayer: (username: string) => void
}

export const useSearchHistoryStore = create<SearchHistoryState>()(
  persist(
    (set, get) => ({
      history: [],

      addPlayer: (entry) => {
        const existing = get().history.filter(
          (e) => e.username.toLowerCase() !== entry.username.toLowerCase(),
        )
        set({ history: [entry, ...existing] })
      },

      removePlayer: (username) => {
        set({
          history: get().history.filter(
            (e) => e.username.toLowerCase() !== username.toLowerCase(),
          ),
        })
      },
    }),
    { name: 'search-history' },
  ),
)
