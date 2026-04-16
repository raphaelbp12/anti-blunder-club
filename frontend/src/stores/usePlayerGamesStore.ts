import { create } from 'zustand'
import { fetchPlayerGames, type ChessGame } from '../services/chessComApi'

interface PlayerGamesState {
  gamesByUsername: Record<string, ChessGame[]>
  isLoading: boolean
  error: string | null
  fetchGames: (username: string) => Promise<void>
}

export const usePlayerGamesStore = create<PlayerGamesState>((set, get) => ({
  gamesByUsername: {},
  isLoading: false,
  error: null,

  fetchGames: async (username: string) => {
    if (get().gamesByUsername[username]) return

    set({ isLoading: true, error: null })

    try {
      const games = await fetchPlayerGames(username)
      set((state) => ({
        gamesByUsername: { ...state.gamesByUsername, [username]: games },
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
