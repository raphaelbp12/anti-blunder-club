// SPDX-License-Identifier: GPL-3.0-or-later
//
// AnalysedTabContent — lists every game the user has analysed (globally,
// across all profiles visited in this browser). Reads from the persisted
// `useAnalysisStore`. Cards are self-contained: they don't depend on
// which player's page you're viewing.

import type { ChessGame } from '../services/chessComApi'
import { extractGameId } from '../services/chessComApi'
import { PieceColour } from '../services/analysis/constants/PieceColour'
import { summarizeClassifications } from '../services/analysis/summarizeClassifications'
import {
  useAnalysisStore,
  type AnalysisEntry,
} from '../stores/useAnalysisStore'
import { ClassificationSummary } from './ClassificationSummary'
import { TrackedLink } from './TrackedLink'

type DoneEntry = Extract<AnalysisEntry, { status: 'done' }>
type DoneWithGame = DoneEntry & { game: ChessGame }

export function AnalysedTabContent() {
  const byGameId = useAnalysisStore((s) => s.byGameId)

  const entries: DoneWithGame[] = Object.values(byGameId)
    .filter((e): e is DoneWithGame => e.status === 'done' && !!e.game)
    .sort((a, b) => b.analysedAt - a.analysedAt)

  if (entries.length === 0) {
    return <p className="text-secondary">No games analysed yet.</p>
  }

  return (
    <ul className="w-full max-w-2xl space-y-3">
      {entries.map((entry) => {
        const { game } = entry
        const gameId = extractGameId(game.url)
        const summary = summarizeClassifications(entry.result.moves)
        return (
          <li
            key={game.url}
            data-testid="analysed-game-card"
            className="flex flex-col gap-3 rounded-lg border border-border p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span>
                  {game.white.username} ({game.white.rating}) vs{' '}
                  {game.black.username} ({game.black.rating})
                </span>
                <span className="text-sm capitalize text-secondary">
                  {game.timeClass}
                </span>
                <span className="text-sm text-muted">
                  Accuracy: {entry.result.accuracy.white.toFixed(1)} /{' '}
                  {entry.result.accuracy.black.toFixed(1)}
                </span>
              </div>
              <TrackedLink
                to={`/player/${game.white.username}/match/${gameId}`}
                state={game}
                eventName="match_view"
                eventParams={{
                  username: game.white.username,
                  game_id: gameId,
                }}
                className="text-accent hover:underline"
              >
                View
              </TrackedLink>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <PlayerSummary
                label={`${game.white.username} (White)`}
                counts={summary[PieceColour.WHITE]}
              />
              <PlayerSummary
                label={`${game.black.username} (Black)`}
                counts={summary[PieceColour.BLACK]}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function PlayerSummary({
  label,
  counts,
}: {
  label: string
  counts: ReturnType<typeof summarizeClassifications>['white']
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-secondary">
        {label}
      </span>
      <ClassificationSummary variant="row" counts={counts} />
    </div>
  )
}
