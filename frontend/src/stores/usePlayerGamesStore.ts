import { create } from 'zustand'
import { fetchPlayerGames, type ChessGame } from '../services/chessComApi'

interface PlayerGamesState {
  gamesByUsername: Record<string, ChessGame[]>
  lastUsername: string | null
  isLoading: boolean
  error: string | null
  fetchGames: (username: string) => Promise<void>
}

export const usePlayerGamesStore = create<PlayerGamesState>((set, get) => ({
  gamesByUsername: {},
  lastUsername: null,
  isLoading: false,
  error: null,

  fetchGames: async (username: string) => {
    if (get().gamesByUsername[username]) {
      set({ lastUsername: username })
      return
    }

    set({ isLoading: true, error: null })

    try {
      const games = await fetchPlayerGames(username)
      set((state) => ({
        gamesByUsername: { ...state.gamesByUsername, [username]: games },
        lastUsername: username,
        isLoading: false,
      }))
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'An error occurred',
        isLoading: false,
      })
    }
  },
}))
