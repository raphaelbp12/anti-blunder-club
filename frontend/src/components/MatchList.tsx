import type { ChessGame } from '../services/chessComApi'
import { extractGameId } from '../services/chessComApi'
import { TrackedLink } from './TrackedLink'

interface MatchListProps {
  games: ChessGame[]
  username: string
}

export function MatchList({ games, username }: MatchListProps) {
  if (games.length === 0) {
    return <p className="text-secondary">No matches found.</p>
  }

  return (
    <ul className="w-full max-w-2xl space-y-3">
      {games.map((game) => (
        <li
          key={game.url}
          className="flex items-center justify-between rounded-lg border border-border p-4"
        >
          <div className="flex flex-col gap-1">
            <span>
              {game.white.username} ({game.white.rating}) vs{' '}
              {game.black.username} ({game.black.rating})
            </span>
            <span className="text-sm capitalize text-secondary">
              {game.timeClass}
            </span>
            <span className="text-sm text-muted">
              Accuracy: {game.accuracies?.white.toFixed(1) ?? '—'} /{' '}
              {game.accuracies?.black.toFixed(1) ?? '—'}
            </span>
          </div>
          <TrackedLink
            to={`/player/${username}/match/${extractGameId(game.url)}`}
            state={game}
            eventName="match_view"
            eventParams={{ username, game_id: extractGameId(game.url) }}
            className="text-accent hover:underline"
          >
            View
          </TrackedLink>
        </li>
      ))}
    </ul>
  )
}
