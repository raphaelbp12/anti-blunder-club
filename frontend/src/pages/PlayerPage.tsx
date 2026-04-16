import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MatchList } from '../components/MatchList'
import { PlayerNavbar } from '../components/PlayerNavbar'
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
        <p className="text-lg text-gray-500">Loading...</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-start gap-6 p-8">
      <PlayerNavbar username={username ?? ''} />
      <Link to="/" className="self-start text-blue-600 hover:underline">
        Back
      </Link>
      <h1 className="text-2xl font-bold">{username}'s Matches</h1>
      {error && <p className="text-red-600">{error}</p>}
      {!error && <MatchList games={games} username={username ?? ''} />}
    </main>
  )
}
