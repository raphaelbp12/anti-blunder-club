import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { MatchList } from '../components/MatchList'
import { usePlayerGamesStore } from '../stores/usePlayerGamesStore'

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
