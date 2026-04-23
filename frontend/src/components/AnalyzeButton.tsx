// SPDX-License-Identifier: GPL-3.0-or-later
//
// AnalyzeButton — per-card control that reflects the union of the
// analysis store and the queue:
//
//   | condition                              | UI                          |
//   |----------------------------------------|-----------------------------|
//   | no PGN                                  | nothing                     |
//   | session has full done entry             | nothing (summary shows)     |
//   | queued                                  | "Queued — cancel"           |
//   | running (store)                         | "Analyzing… X%"             |
//   | error                                   | "Failed — retry"            |
//   | otherwise                               | "Analyze"                   |
//
// The button does not know about the engine. It just enqueues a
// `QueueItem`; the queue store handles everything else.

import type { ChessGame } from '../services/chessComApi'
import { useAnalysisQueueStore } from '../stores/useAnalysisQueueStore'
import { useAnalysisStore } from '../stores/useAnalysisStore'
import { TrackedButton } from './TrackedButton'

interface AnalyzeButtonProps {
  gameId: string
  pgn: string | undefined
  game: ChessGame
}

export function AnalyzeButton({ gameId, pgn, game }: AnalyzeButtonProps) {
  const entry = useAnalysisStore((s) => s.byGameId[gameId])
  const isPending = useAnalysisQueueStore((s) =>
    s.pending.some((p) => p.gameId === gameId),
  )
  const enqueue = useAnalysisQueueStore((s) => s.enqueue)
  const cancel = useAnalysisQueueStore((s) => s.cancel)

  if (!pgn) return null
  // Full session result is already loaded → summary row + match-page detail
  // handle the rest; no button needed.
  if (entry?.status === 'done' && entry.result) return null

  if (isPending) {
    return (
      <button
        type="button"
        onClick={() => cancel(gameId)}
        className="text-xs text-secondary hover:underline"
      >
        Queued — cancel
      </button>
    )
  }

  if (entry?.status === 'running') {
    const pct = Math.round(entry.progress * 100)
    return (
      <span className="text-xs text-secondary" aria-live="polite">
        Analyzing… {pct}%
      </span>
    )
  }

  if (entry?.status === 'error') {
    return (
      <TrackedButton
        onClick={() => enqueue({ gameId, pgn, game })}
        eventName="analysis_run_requested"
        className="text-xs font-semibold text-danger hover:underline"
      >
        Failed — retry
      </TrackedButton>
    )
  }

  // `done` without result (hydrated from localStorage) or idle → offer a run.
  const isReanalyze = entry?.status === 'done'
  const className = isReanalyze
    ? 'rounded border border-accent bg-transparent px-2 py-1 text-xs font-semibold text-accent hover:bg-accent/10'
    : 'rounded bg-accent px-2 py-1 text-xs font-semibold text-white hover:opacity-90'
  return (
    <TrackedButton
      onClick={() => enqueue({ gameId, pgn, game })}
      eventName="analysis_run_requested"
      className={className}
    >
      {isReanalyze ? 'Re-analyze' : 'Analyze'}
    </TrackedButton>
  )
}
