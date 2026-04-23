// SPDX-License-Identifier: GPL-3.0-or-later
//
// BatchAnalysisProgress — small sticky banner that surfaces the state of
// the analysis queue. Renders nothing when the queue is empty.

import { useAnalysisQueueStore } from '../stores/useAnalysisQueueStore'

export function BatchAnalysisProgress() {
  const pending = useAnalysisQueueStore((s) => s.pending.length)
  const running = useAnalysisQueueStore((s) => s.running.length)
  const batchTotal = useAnalysisQueueStore((s) => s.batchTotal)
  const batchDone = useAnalysisQueueStore((s) => s.batchDone)
  const cancelAll = useAnalysisQueueStore((s) => s.cancelAll)

  if (pending + running === 0) return null

  const pct =
    batchTotal > 0
      ? Math.min(100, Math.round((batchDone / batchTotal) * 100))
      : 0

  return (
    <div
      className="sticky top-20 z-10 w-full max-w-2xl rounded-lg border border-border bg-surface p-3 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between text-sm">
        <span>
          Analyzing{' '}
          <span className="font-semibold">
            {batchDone} / {batchTotal}
          </span>{' '}
          <span className="text-secondary">
            ({running} running, {pending} queued)
          </span>
        </span>
        <button
          type="button"
          onClick={cancelAll}
          className="text-accent hover:underline"
        >
          Cancel all
        </button>
      </div>
      <div
        className="mt-2 h-1 w-full overflow-hidden rounded bg-background"
        aria-hidden
      >
        <div
          data-testid="batch-progress-bar-fill"
          className="h-full rounded bg-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
