import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { PlayerNavbar } from '../components/PlayerNavbar'
import { fetchPlayerGame, type ChessGame } from '../services/chessComApi'

export function MatchPage() {
  const { username, gameId } = useParams<{
    username: string
    gameId: string
  }>()
  const location = useLocation()
  const stateGame = location.state as ChessGame | null

  const [game, setGame] = useState<ChessGame | null>(stateGame)
  const [isLoading, setIsLoading] = useState(!stateGame)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (stateGame || !username || !gameId) return

    fetchPlayerGame(username, gameId)
      .then(setGame)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'An error occurred'),
      )
      .finally(() => setIsLoading(false))
  }, [stateGame, username, gameId])

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <p className="text-lg text-gray-500">Loading...</p>
      </main>
    )
  }

  if (error || !game) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-red-600">{error ?? 'Game not found'}</p>
        <Link
          to={`/player/${username}`}
          className="text-blue-600 hover:underline"
        >
          Back to matches
        </Link>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-start gap-6 p-8">
      <PlayerNavbar username={username ?? ''} />
      <h1 className="text-2xl font-bold">Match Details</h1>
      <div className="w-full max-w-lg space-y-4 rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between">
          <div>
            <p className="font-semibold">{game.white.username}</p>
            <p className="text-sm text-gray-500">Rating: {game.white.rating}</p>
            <p className="text-sm capitalize">Result: {game.white.result}</p>
            <p className="text-sm text-gray-500">
              Accuracy: {game.accuracies?.white.toFixed(1) ?? '—'}
            </p>
          </div>
          <span className="self-center text-gray-400">vs</span>
          <div className="text-right">
            <p className="font-semibold">{game.black.username}</p>
            <p className="text-sm text-gray-500">Rating: {game.black.rating}</p>
            <p className="text-sm capitalize">Result: {game.black.result}</p>
            <p className="text-sm text-gray-500">
              Accuracy: {game.accuracies?.black.toFixed(1) ?? '—'}
            </p>
          </div>
        </div>
        <p className="text-center text-sm capitalize text-gray-500">
          {game.timeClass}
        </p>
        <div className="text-center">
          <a
            href={game.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            View on Chess.com
          </a>
        </div>
      </div>
    </main>
  )
}
