import type { ChessGame } from '../services/chessComApi'

interface MatchListProps {
  games: ChessGame[]
}

export function MatchList({ games }: MatchListProps) {
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
          </div>
          <a
            href={game.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            View
          </a>
        </li>
      ))}
    </ul>
  )
}
