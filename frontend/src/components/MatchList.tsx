import { Link } from 'react-router-dom'
import type { ChessGame } from '../services/chessComApi'
import { extractGameId } from '../services/chessComApi'

interface MatchListProps {
  games: ChessGame[]
  username: string
}

export function MatchList({ games, username }: MatchListProps) {
  if (games.length === 0) {
    return <p className="text-gray-500">No matches found.</p>
  }

  return (
    <ul className="w-full max-w-2xl space-y-3">
      {games.map((game) => (
        <li
          key={game.url}
          className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
        >
          <div className="flex flex-col gap-1">
            <span>
              {game.white.username} ({game.white.rating}) vs{' '}
              {game.black.username} ({game.black.rating})
            </span>
            <span className="text-sm capitalize text-gray-500">
              {game.timeClass}
            </span>
            <span className="text-sm text-gray-400">
              Accuracy: {game.accuracies?.white.toFixed(1) ?? '—'} /{' '}
              {game.accuracies?.black.toFixed(1) ?? '—'}
            </span>
          </div>
          <Link
            to={`/player/${username}/match/${extractGameId(game.url)}`}
            state={game}
            className="text-blue-600 hover:underline"
          >
            View
          </Link>
        </li>
      ))}
    </ul>
  )
}
