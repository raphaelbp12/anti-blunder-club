import type { ChessGame } from '../services/chessComApi'
import { extractGameId } from '../services/chessComApi'
import { PieceColour } from '../services/analysis/constants/PieceColour'
import { summarizeClassifications } from '../services/analysis/summarizeClassifications'
import { useAnalysisStore } from '../stores/useAnalysisStore'
import { getPlayerResult } from '../utils/playerResult'
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
          entry?.status === 'done' && playerColour
            ? summarizeClassifications(entry.result.moves)[playerColour]
            : null
        return (
          <li
            key={game.url}
            className="flex items-center justify-between gap-4 rounded-lg border border-border p-4"
          >
            <div className="flex items-center gap-4">
              <ResultBadge result={result} />
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
                {playerCounts && (
                  <ClassificationSummary variant="row" counts={playerCounts} />
                )}
              </div>
            </div>
            <TrackedLink
              to={`/player/${username}/match/${gameId}`}
              state={game}
              eventName="match_view"
              eventParams={{ username, game_id: gameId }}
              className="text-accent hover:underline"
            >
              View
            </TrackedLink>
          </li>
        )
      })}
    </ul>
  )
}
