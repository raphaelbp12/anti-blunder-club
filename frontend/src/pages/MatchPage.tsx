import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { ClassificationSummary } from '../components/ClassificationSummary'
import { SEOHelmet } from '../components/SEOHelmet'
import { TrackedButton } from '../components/TrackedButton'
import { TrackedExternalLink } from '../components/TrackedExternalLink'
import { fetchPlayerGame, type ChessGame } from '../services/chessComApi'
import { summarizeClassifications } from '../services/analysis/summarizeClassifications'
import { useAnalysisStore } from '../stores/useAnalysisStore'
import { trackEvent } from '../utils/analytics'

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
  const [showDetails, setShowDetails] = useState(false)

  const entry = useAnalysisStore((s) =>
    gameId ? s.byGameId[gameId] : undefined,
  )
  const startAnalysis = useAnalysisStore((s) => s.startAnalysis)
  const resetAnalysis = useAnalysisStore((s) => s.reset)

  useEffect(() => {
    if (stateGame || !username || !gameId) return

    fetchPlayerGame(username, gameId)
      .then(setGame)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'An error occurred'),
      )
      .finally(() => setIsLoading(false))
  }, [stateGame, username, gameId])

  const detailsJson = useMemo(() => {
    if (entry?.status !== 'done') return null
    return JSON.stringify(
      entry.result.moves.map((m) => ({
        san: m.san,
        classification: m.classification,
        accuracy: m.accuracy,
      })),
      null,
      2,
    )
  }, [entry])

  const classificationSummary = useMemo(() => {
    if (entry?.status !== 'done') return null
    return summarizeClassifications(entry.result.moves)
  }, [entry])

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

  const runAnalysis = () => {
    if (!game.pgn || !gameId) return
    const pgn = game.pgn
    void startAnalysis(gameId, pgn).then(() => {
      const latest = useAnalysisStore.getState().byGameId[gameId]
      if (latest?.status === 'done') {
        trackEvent('analysis_run_completed', {
          durationMs: latest.durationMs,
          moveCount: latest.result.moves.length,
        })
      } else if (latest?.status === 'error') {
        trackEvent('analysis_run_failed', { reason: latest.error })
      }
    })
  }

  const handleRetry = () => {
    if (!gameId) return
    resetAnalysis(gameId)
    runAnalysis()
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

      {game.pgn && (
        <section
          className="w-full max-w-lg space-y-3 rounded-lg border border-border p-6"
          aria-label="Engine analysis"
        >
          <h2 className="text-lg font-semibold">Engine analysis</h2>

          {(!entry || entry.status === 'idle') && (
            <TrackedButton
              onClick={runAnalysis}
              eventName="analysis_run_requested"
              className="rounded bg-accent px-4 py-2 text-sm font-semibold text-background hover:opacity-90"
            >
              Analyze game
            </TrackedButton>
          )}

          {entry?.status === 'running' && (
            <p className="text-sm text-secondary">
              Analyzing… {Math.round(entry.progress * 100)}%
            </p>
          )}

          {entry?.status === 'done' && (
            <div className="space-y-3">
              <p className="text-sm">
                White accuracy:{' '}
                <span className="font-semibold">
                  {entry.result.accuracy.white.toFixed(1)}
                </span>{' '}
                · Black accuracy:{' '}
                <span className="font-semibold">
                  {entry.result.accuracy.black.toFixed(1)}
                </span>
              </p>
              {classificationSummary && (
                <ClassificationSummary
                  variant="column"
                  white={classificationSummary.white}
                  black={classificationSummary.black}
                />
              )}
              <button
                type="button"
                onClick={() => setShowDetails((v) => !v)}
                className="text-sm text-accent hover:underline"
              >
                {showDetails ? 'Hide details ▴' : 'Show details ▾'}
              </button>
              {showDetails && detailsJson && (
                <pre className="max-h-96 overflow-auto rounded bg-surface p-3 text-xs">
                  {detailsJson}
                </pre>
              )}
            </div>
          )}

          {entry?.status === 'error' && (
            <div className="space-y-2">
              <p className="text-sm text-danger">
                Analysis failed: {entry.error}
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="rounded border border-border px-3 py-1 text-sm hover:bg-surface"
              >
                Retry
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  )
}
