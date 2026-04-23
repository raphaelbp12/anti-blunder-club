import type { ChessGame } from '../services/chessComApi'
import { extractGameId } from '../services/chessComApi'
import { PieceColour } from '../services/analysis/constants/PieceColour'
import { useAnalysisStore } from '../stores/useAnalysisStore'
import { getPlayerResult } from '../utils/playerResult'
import { AnalyzeButton } from './AnalyzeButton'
import { ClassificationSummary } from './ClassificationSummary'
import { ResultBadge } from './ResultBadge'
import { TrackedLink } from './TrackedLink'

interface MatchListProps {
  games: ChessGame[]
  username: string
}

export function MatchList({ games, username }: MatchListProps) {
  const byGameId = useAnalysisStore((s) => s.byGameId)

  if (games.length === 0) {
    return <p className="text-secondary">No matches found.</p>
  }

  const lowerUsername = username.toLowerCase()

  return (
    <ul className="w-full max-w-2xl space-y-3">
      {games.map((game) => {
        const result = getPlayerResult(game, username)
        const gameId = extractGameId(game.url)
        const entry = byGameId[gameId]
        const playerColour =
          game.white.username.toLowerCase() === lowerUsername
            ? PieceColour.WHITE
            : game.black.username.toLowerCase() === lowerUsername
              ? PieceColour.BLACK
              : null
        const playerCounts =
          entry?.status === 'done' && entry.summary && playerColour
            ? entry.summary[playerColour]
            : null
        return (
          <li
            key={game.url}
            className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4"
          >
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <ResultBadge result={result} />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-sm sm:text-base">
                  <span className="font-medium">{game.white.username}</span>
                  <span className="text-secondary"> ({game.white.rating})</span>
                  <span className="text-secondary"> vs </span>
                  <span className="font-medium">{game.black.username}</span>
                  <span className="text-secondary"> ({game.black.rating})</span>
                </span>
                <span className="text-xs capitalize text-secondary sm:text-sm">
                  {game.timeClass}
                </span>
                <span className="text-xs text-muted sm:text-sm">
                  Accuracy: {game.accuracies?.white.toFixed(1) ?? '—'} /{' '}
                  {game.accuracies?.black.toFixed(1) ?? '—'}
                </span>
                {playerCounts && (
                  <ClassificationSummary variant="row" counts={playerCounts} />
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 sm:shrink-0">
              <AnalyzeButton gameId={gameId} pgn={game.pgn} game={game} />
              <TrackedLink
                to={`/player/${username}/match/${gameId}`}
                state={game}
                eventName="match_view"
                eventParams={{ username, game_id: gameId }}
                className="text-accent hover:underline"
              >
                View
              </TrackedLink>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
