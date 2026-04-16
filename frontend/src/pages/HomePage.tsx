import { useState } from 'react'
import { PlayerSearch } from '../components/PlayerSearch'
import { MatchList } from '../components/MatchList'
import { fetchPlayerGames, type ChessGame } from '../services/chessComApi'

export function HomePage() {
  const [games, setGames] = useState<ChessGame[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  async function handleSearch(username: string) {
    setIsLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const result = await fetchPlayerGames(username)
      setGames(result)
    } catch (err) {
      setGames([])
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-start gap-6 p-8">
      <h1 className="text-4xl font-bold">Anti-Blunder Club</h1>
      <PlayerSearch onSearch={handleSearch} isLoading={isLoading} />
      {error && <p className="text-red-600">{error}</p>}
      {hasSearched && !error && <MatchList games={games} />}
    </main>
  )
}
