import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import {
  DATE_FILTER_OPTIONS,
  DEFAULT_DATE_FILTER,
  filterGamesByDate,
  type DateFilterValue,
} from '../dateFilter'
import type { ChessGame } from '../../services/chessComApi'

// Build a minimal ChessGame with only the fields the filter reads.
function makeGame(endTimeSeconds: number): ChessGame {
  return {
    url: `https://www.chess.com/game/live/${endTimeSeconds}`,
    white: { username: 'p1', rating: 1500, result: 'win' },
    black: { username: 'p2', rating: 1500, result: 'loss' },
    timeClass: 'blitz',
    endTime: endTimeSeconds,
  }
}

// Anchor "now" to a fixed moment so the tests are deterministic.
// 2026-04-23 12:00:00 UTC
const NOW = new Date('2026-04-23T12:00:00Z')
const NOW_SEC = Math.floor(NOW.getTime() / 1000)
const DAY = 24 * 60 * 60

describe('dateFilter presets', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('exposes the five presets in the expected order with last_3_months as default', () => {
    expect(DATE_FILTER_OPTIONS.map((o) => o.value)).toEqual([
      'today',
      'yesterday',
      'last_week',
      'last_month',
      'last_3_months',
    ])
    expect(DEFAULT_DATE_FILTER).toBe('last_3_months')
  })

  it('"today" keeps games with endTime at or after the start of today (UTC)', () => {
    const startOfToday = Date.UTC(2026, 3, 23) / 1000 // 2026-04-23 00:00Z
    const games = [
      makeGame(startOfToday), // exactly at midnight — included
      makeGame(NOW_SEC - 60), // a minute ago — included
      makeGame(startOfToday - 1), // 1 second before midnight — excluded
    ]
    const result = filterGamesByDate(games, 'today')
    expect(result).toHaveLength(2)
    expect(result.map((g) => g.endTime)).toEqual([startOfToday, NOW_SEC - 60])
  })

  it('"yesterday" keeps games between start of yesterday and start of today', () => {
    const startOfToday = Date.UTC(2026, 3, 23) / 1000
    const startOfYesterday = startOfToday - DAY
    const games = [
      makeGame(startOfYesterday), // included (inclusive lower bound)
      makeGame(startOfToday - 1), // included (just before midnight)
      makeGame(startOfToday), // excluded (that's today)
      makeGame(startOfYesterday - 1), // excluded (day before yesterday)
    ]
    const result = filterGamesByDate(games, 'yesterday')
    expect(result.map((g) => g.endTime)).toEqual([
      startOfYesterday,
      startOfToday - 1,
    ])
  })

  it('"last_week" keeps games from the last 7 days (rolling, inclusive of now)', () => {
    const games = [
      makeGame(NOW_SEC), // now
      makeGame(NOW_SEC - 7 * DAY + 1), // just inside 7 days
      makeGame(NOW_SEC - 7 * DAY - 1), // just outside 7 days
    ]
    const result = filterGamesByDate(games, 'last_week')
    expect(result).toHaveLength(2)
    expect(result.map((g) => g.endTime)).toEqual([
      NOW_SEC,
      NOW_SEC - 7 * DAY + 1,
    ])
  })

  it('"last_month" keeps games from the last 30 days', () => {
    const games = [
      makeGame(NOW_SEC - 29 * DAY),
      makeGame(NOW_SEC - 30 * DAY - 1),
    ]
    const result = filterGamesByDate(games, 'last_month')
    expect(result).toHaveLength(1)
    expect(result[0].endTime).toBe(NOW_SEC - 29 * DAY)
  })

  it('"last_3_months" keeps games from the last 90 days', () => {
    const games = [
      makeGame(NOW_SEC - 89 * DAY),
      makeGame(NOW_SEC - 90 * DAY - 1),
    ]
    const result = filterGamesByDate(games, 'last_3_months')
    expect(result).toHaveLength(1)
    expect(result[0].endTime).toBe(NOW_SEC - 89 * DAY)
  })

  it('accepts an explicit "now" override for deterministic callers', () => {
    const explicitNow = new Date('2026-01-15T00:00:00Z')
    const explicitNowSec = Math.floor(explicitNow.getTime() / 1000)
    const games = [
      makeGame(explicitNowSec - DAY + 1), // just inside 1 day → "today"? no, today = start-of-day
    ]
    const result = filterGamesByDate(games, 'last_week', explicitNow)
    expect(result).toHaveLength(1)
  })

  it('returns the input unchanged when the value is not a known preset (defensive)', () => {
    const games = [makeGame(NOW_SEC - 365 * DAY)]
    // Intentionally cast to exercise the defensive branch.
    const result = filterGamesByDate(games, 'unknown' as DateFilterValue)
    expect(result).toEqual(games)
  })
})
