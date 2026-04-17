import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { MatchList } from '../components/MatchList'
import {
  fetchPlayerProfile,
  fetchPlayerStats,
  getHighestRating,
} from '../services/chessComApi'
import { usePlayerGamesStore } from '../stores/usePlayerGamesStore'
import { useSearchHistoryStore } from '../stores/useSearchHistoryStore'
import { trackEvent } from '../utils/analytics'

export function PlayerPage() {
  const { username } = useParams<{ username: string }>()
  const { gamesByUsername, isLoading, error, fetchGames } =
    usePlayerGamesStore()

  useEffect(() => {
    if (username) {
      fetchGames(username)
    }
  }, [username, fetchGames])

  const games = username ? (gamesByUsername[username] ?? []) : []
  const addPlayer = useSearchHistoryStore((s) => s.addPlayer)
  const profileFetchedFor = useRef<string | null>(null)
  const resultTrackedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!username || isLoading) return
    if (resultTrackedFor.current === username) return

    if (error) {
      resultTrackedFor.current = username
      trackEvent('player_search_result', {
        username,
        result: 'error',
        game_count: 0,
      })
    } else if (gamesByUsername[username]) {
      resultTrackedFor.current = username
      trackEvent('player_search_result', {
        username,
        result: 'success',
        game_count: gamesByUsername[username].length,
      })
    }
  }, [username, gamesByUsername, isLoading, error])

  useEffect(() => {
    if (!username || !gamesByUsername[username] || error || isLoading) return
    if (profileFetchedFor.current === username) return
    profileFetchedFor.current = username

    let cancelled = false

    async function fetchProfile() {
      try {
        const [profile, stats] = await Promise.all([
          fetchPlayerProfile(username!),
          fetchPlayerStats(username!),
        ])
        if (!cancelled) {
          addPlayer({
            username: profile.username,
            avatarUrl: profile.avatar,
            highestRating: getHighestRating(stats),
          })
        }
      } catch {
        if (!cancelled) {
          addPlayer({ username: username!, highestRating: null })
        }
      }
    }

    fetchProfile()
    return () => {
      cancelled = true
      profileFetchedFor.current = null
    }
  }, [username, gamesByUsername, error, isLoading, addPlayer])

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <p className="text-lg text-secondary">Loading...</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-start gap-6 p-8">
      <h1 className="text-2xl font-bold">{username}'s Matches</h1>
      {error && <p className="text-danger">{error}</p>}
      {!error && <MatchList games={games} username={username ?? ''} />}
    </main>
  )
}
