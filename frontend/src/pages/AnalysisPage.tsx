import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import posthog from 'posthog-js'
import { TrackedLink } from '../components/TrackedLink'
import { usePlayerGamesStore } from '../stores/usePlayerGamesStore'
import { analyzeAccuracy } from '../utils/accuracyAnalysis'
import { extractGameId } from '../services/chessComApi'

export function AnalysisPage() {
  const { username } = useParams<{ username: string }>()
  const { gamesByUsername, isLoading, error, fetchGames } =
    usePlayerGamesStore()

  useEffect(() => {
    if (username) {
      fetchGames(username)
    }
  }, [username, fetchGames])

  const games = username ? (gamesByUsername[username] ?? []) : []
  const analysis = analyzeAccuracy(games, username ?? '')

  const analysisTrackedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!username || isLoading || error) return
    if (analysisTrackedFor.current === username) return
    if (!gamesByUsername[username]) return
    analysisTrackedFor.current = username
    posthog.capture('analysis_viewed', {
      username,
      games_analyzed: analysis.gamesAnalyzed,
      mean_accuracy: analysis.meanAccuracy,
    })
  }, [username, isLoading, error, gamesByUsername, analysis])

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <p className="text-lg text-secondary">Loading...</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-start gap-6 p-8">
      <h1 className="text-2xl font-bold">{username}'s Accuracy Analysis</h1>
      {error && <p className="text-danger">{error}</p>}
      {!error && analysis.gamesAnalyzed === 0 && (
        <p className="text-secondary">No accuracy data available</p>
      )}
      {!error && analysis.gamesAnalyzed > 0 && (
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
                    game.white.username.toLowerCase() ===
                    username?.toLowerCase()
                      ? game.black
                      : game.white
                  return (
                    <li
                      key={game.url}
                      className="flex items-center justify-between rounded-lg border border-border p-4"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold">
                          vs {opponent.username} ({opponent.rating})
                        </span>
                        <span className="text-sm capitalize text-secondary">
                          {game.timeClass}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-bold text-danger">
                          {accuracy.toFixed(1)}%
                        </span>
                        <TrackedLink
                          to={`/player/${username}/match/${extractGameId(game.url)}`}
                          state={game}
                          eventName="match_view"
                          eventParams={{
                            username: username!,
                            game_id: extractGameId(game.url),
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
      )}
    </main>
  )
}
