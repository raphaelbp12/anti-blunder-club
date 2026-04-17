import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { SEOHelmet } from '../components/SEOHelmet'
import { TrackedExternalLink } from '../components/TrackedExternalLink'
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
        <p className="text-lg text-secondary">Loading...</p>
      </main>
    )
  }

  if (error || !game) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-danger">{error ?? 'Game not found'}</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-start gap-6 p-8">
      <SEOHelmet
        title={`Game Analysis — ${game.white.username} vs ${game.black.username}`}
        description={`Chess game analysis: ${game.white.username} (${game.white.rating}) vs ${game.black.username} (${game.black.rating}). ${game.timeClass} game review.`}
        path={`/player/${username}/match/${gameId}`}
      />
      <h1 className="text-2xl font-bold">Match Details</h1>
      <div className="w-full max-w-lg space-y-4 rounded-lg border border-border p-6">
        <div className="flex justify-between">
          <div>
            <p className="font-semibold">{game.white.username}</p>
            <p className="text-sm text-secondary">
              Rating: {game.white.rating}
            </p>
            <p className="text-sm capitalize">Result: {game.white.result}</p>
            <p className="text-sm text-secondary">
              Accuracy: {game.accuracies?.white.toFixed(1) ?? '—'}
            </p>
          </div>
          <span className="self-center text-muted">vs</span>
          <div className="text-right">
            <p className="font-semibold">{game.black.username}</p>
            <p className="text-sm text-secondary">
              Rating: {game.black.rating}
            </p>
            <p className="text-sm capitalize">Result: {game.black.result}</p>
            <p className="text-sm text-secondary">
              Accuracy: {game.accuracies?.black.toFixed(1) ?? '—'}
            </p>
          </div>
        </div>
        <p className="text-center text-sm capitalize text-secondary">
          {game.timeClass}
        </p>
        <div className="text-center">
          <TrackedExternalLink
            href={game.url}
            target="_blank"
            rel="noopener noreferrer"
            eventName="external_link_click"
            eventParams={{
              username: username!,
              game_id: gameId!,
              url: game.url,
            }}
            className="text-accent hover:underline"
          >
            View on Chess.com
          </TrackedExternalLink>
        </div>
      </div>
    </main>
  )
}
