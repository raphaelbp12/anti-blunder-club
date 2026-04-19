// SPDX-License-Identifier: GPL-3.0-or-later
//
// Calibration fixture fetcher.
//
// For each `{ username, gameId }` in `games.json`, walk the player's
// Chess.com monthly archives (newest first) until the matching game id
// shows up, then cache the raw JSON under `fixtures/<gameId>.json`.
//
// Idempotent: a game with a cached file is skipped. Safe to re-run after
// adding new entries to `games.json`.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = __dirname
const FIXTURES_DIR = resolve(ROOT, 'fixtures')
const GAMES_FILE = resolve(ROOT, 'games.json')

interface SeedEntry {
  username: string
  gameId: string
  note?: string
}

interface ArchivesResponse {
  archives: string[]
}

// We only need these fields; the raw JSON has more.
interface RawGame {
  url: string
  pgn?: string
  accuracies?: { white: number; black: number }
  white: { username: string; rating: number; result: string }
  black: { username: string; rating: number; result: string }
  time_class: string
  time_control?: string
  rated?: boolean
  rules?: string
  end_time: number
  eco?: string
}

interface GamesResponse {
  games: RawGame[]
}

function extractGameId(url: string): string {
  return url.split('/').filter(Boolean).pop() ?? ''
}

async function fetchJson<T>(url: string): Promise<T> {
  // Chess.com's API requires a User-Agent header or it returns 403.
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'anti-blunder-club-calibration/0.1 (+https://github.com/raphaelbp12/anti-blunder-club)',
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`)
  }
  return (await res.json()) as T
}

async function findGame(
  username: string,
  gameId: string,
): Promise<RawGame | null> {
  const { archives } = await fetchJson<ArchivesResponse>(
    `https://api.chess.com/pub/player/${username}/games/archives`,
  )

  // Newest first.
  for (let i = archives.length - 1; i >= 0; i--) {
    const { games } = await fetchJson<GamesResponse>(archives[i])
    const hit = games.find((g) => extractGameId(g.url) === gameId)
    if (hit) return hit
  }
  return null
}

async function main() {
  if (!existsSync(GAMES_FILE)) {
    console.error(`games.json not found at ${GAMES_FILE}`)
    process.exit(1)
  }
  mkdirSync(FIXTURES_DIR, { recursive: true })

  const seed: SeedEntry[] = JSON.parse(readFileSync(GAMES_FILE, 'utf8'))
  let downloaded = 0
  let skipped = 0
  let failed = 0

  for (const entry of seed) {
    const outPath = resolve(FIXTURES_DIR, `${entry.gameId}.json`)
    if (existsSync(outPath)) {
      skipped++
      continue
    }
    try {
      console.log(`[fetch] ${entry.username} / ${entry.gameId}`)
      const game = await findGame(entry.username, entry.gameId)
      if (!game) {
        console.error(`  not found in any archive`)
        failed++
        continue
      }
      writeFileSync(outPath, JSON.stringify(game, null, 2))
      downloaded++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  error: ${msg}`)
      failed++
    }
  }

  console.log(
    `\nDone. downloaded=${downloaded} skipped=${skipped} failed=${failed}`,
  )
  if (failed > 0) process.exit(2)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
