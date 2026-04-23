import { useEffect, useRef } from 'react'
import type { ChessGame } from '../services/chessComApi'
import { extractGameId } from '../services/chessComApi'
import { PieceColour } from '../services/analysis/constants/PieceColour'
import { useAnalysisStore } from '../stores/useAnalysisStore'
import { analyzeAccuracy } from '../utils/accuracyAnalysis'
import { trackEvent } from '../utils/analytics'
import { getPlayerResult } from '../utils/playerResult'
import { AnalyzeButton } from './AnalyzeButton'
import { ClassificationSummary } from './ClassificationSummary'
import { ResultBadge } from './ResultBadge'
import { TrackedLink } from './TrackedLink'

interface AccuracyTabContentProps {
  games: ChessGame[]
  username: string
}

export function AccuracyTabContent({
  games,
  username,
}: AccuracyTabContentProps) {
  const analysis = analyzeAccuracy(games, username)
  const byGameId = useAnalysisStore((s) => s.byGameId)
  const lowerUsername = username.toLowerCase()

  const trackedFor = useRef<string | null>(null)
  useEffect(() => {
    if (trackedFor.current === username) return
    if (analysis.gamesAnalyzed === 0) return
    trackedFor.current = username
    trackEvent('analysis_viewed', {
      username,
      games_analyzed: analysis.gamesAnalyzed,
      mean_accuracy: analysis.meanAccuracy,
    })
  }, [username, analysis])

  if (analysis.gamesAnalyzed === 0) {
    return <p className="text-secondary">No accuracy data available</p>
  }

  return (
    <>
      <div className="w-full max-w-2xl rounded-lg border border-border p-6 text-center">
        <p className="text-3xl font-bold">
          {analysis.meanAccuracy.toFixed(1)}%
        </p>
        <p className="text-sm text-secondary">
          Mean Accuracy ({analysis.gamesAnalyzed} games analyzed)
        </p>
      </div>

      {analysis.gamesBelowAverage.length === 0 ? (
        <p className="text-secondary">No games below average</p>
      ) : (
        <>
          <h2 className="self-start text-lg font-semibold">
            Below Average ({analysis.gamesBelowAverage.length})
          </h2>
          <ul className="w-full max-w-2xl space-y-3">
            {analysis.gamesBelowAverage.map(({ game, accuracy }) => {
              const opponent =
                game.white.username.toLowerCase() === username.toLowerCase()
                  ? game.black
                  : game.white
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
                  className="flex items-center justify-between gap-4 rounded-lg border border-border p-4"
                >
                  <div className="flex items-center gap-4">
                    <ResultBadge result={result} />
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold">
                        vs {opponent.username} ({opponent.rating})
                      </span>
                      <span className="text-sm capitalize text-secondary">
                        {game.timeClass}
                      </span>
                      {playerCounts && (
                        <ClassificationSummary
                          variant="row"
                          counts={playerCounts}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-danger">
                      {accuracy.toFixed(1)}%
                    </span>
                    <AnalyzeButton gameId={gameId} pgn={game.pgn} game={game} />
                    <TrackedLink
                      to={`/player/${username}/match/${gameId}`}
                      state={game}
                      eventName="match_view"
                      eventParams={{
                        username,
                        game_id: gameId,
                      }}
                      className="text-accent hover:underline"
                    >
                      View
                    </TrackedLink>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </>
  )
}
