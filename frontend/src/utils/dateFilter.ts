import type { ChessGame } from '../services/chessComApi'

export type DateFilterValue =
  | 'today'
  | 'yesterday'
  | 'last_week'
  | 'last_month'
  | 'last_3_months'

export interface DateFilterOption {
  label: string
  value: DateFilterValue
}

export const DATE_FILTER_OPTIONS: DateFilterOption[] = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last week', value: 'last_week' },
  { label: 'Last month', value: 'last_month' },
  { label: 'Last 3 months', value: 'last_3_months' },
]

export const DEFAULT_DATE_FILTER: DateFilterValue = 'last_3_months'

const DAY_SECONDS = 24 * 60 * 60

/** Seconds since epoch at the start of the UTC day containing `date`. */
function startOfUtcDaySeconds(date: Date): number {
  return (
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
    1000
  )
}

/**
 * Returns the inclusive `[minEndTime, maxEndTime]` window (UNIX seconds) for a
 * given preset, relative to `now`. `maxEndTime` is `Infinity` for rolling
 * "last N" windows (they include up to the present), and the start of today
 * minus 1 second for the "yesterday" bucket (which is strictly before today).
 */
function windowFor(
  value: DateFilterValue,
  now: Date,
): { min: number; max: number } | null {
  const startOfTodaySec = startOfUtcDaySeconds(now)
  const nowSec = Math.floor(now.getTime() / 1000)

  switch (value) {
    case 'today':
      return { min: startOfTodaySec, max: Infinity }
    case 'yesterday':
      return {
        min: startOfTodaySec - DAY_SECONDS,
        max: startOfTodaySec - 1,
      }
    case 'last_week':
      return { min: nowSec - 7 * DAY_SECONDS, max: Infinity }
    case 'last_month':
      return { min: nowSec - 30 * DAY_SECONDS, max: Infinity }
    case 'last_3_months':
      return { min: nowSec - 90 * DAY_SECONDS, max: Infinity }
    default:
      return null
  }
}

/**
 * Filters games by their `endTime` (UNIX seconds) against a preset date range.
 *
 * - Presets are evaluated relative to `now` (defaults to the current time).
 * - Unknown values return the input unchanged, so callers are never caught
 *   out if the union grows without all call sites being updated.
 */
export function filterGamesByDate(
  games: ChessGame[],
  value: DateFilterValue,
  now: Date = new Date(),
): ChessGame[] {
  const w = windowFor(value, now)
  if (!w) return games
  return games.filter((g) => g.endTime >= w.min && g.endTime <= w.max)
}
