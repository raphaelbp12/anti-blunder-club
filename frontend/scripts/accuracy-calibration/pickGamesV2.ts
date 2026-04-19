// Extended corpus builder.
//
// Combines:
//  1. Explicit seeds (exact username+gameId pairs).
//  2. A gap-filling scan across a list of usernames that hunts for games
//     matching specific underrepresented profiles (short, long, draws,
//     mid-rating).
//
// Merges into games.json, deduping by gameId.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const GAMES_FILE = resolve(__dirname, 'games.json')

const UA =
  'anti-blunder-club-calibration (github.com/raphaelbp12/anti-blunder-club)'

interface SeedEntry {
  username: string
  gameId: string
  note?: string
}

interface RawGame {
  url: string
  pgn?: string
  accuracies?: { white: number; black: number }
  white: { username: string; rating: number; result: string }
  black: { username: string; rating: number; result: string }
  time_class: string
  end_time: number
  rated?: boolean
}

// --- explicit games we must include ---------------------------------------

const EXPLICIT: SeedEntry[] = [
  { username: 'danilorogg1', gameId: '167507886356', note: 'user-requested' },
  { username: 'gmkrikor', gameId: '167052490076', note: 'user-requested' },
  { username: 'gmkrikor', gameId: '167454505792', note: 'user-requested' },
]

// --- users to scan for gap-filling candidates -----------------------------

const USERS = [
  'pigor1',
  'artenio',
  'gushiro',
  'gaguera',
  'igricart',
  'diogomonte',
  'gmkrikor',
  'magnuscarlsen',
  'hikaru',
  '22manudt',
]

// Profile buckets we want to fill.
interface Bucket {
  name: string
  want: number
  got: number
  match: (g: RawGame) => boolean
}

function plyCount(pgn: string): number {
  // Rough: count SAN moves in PGN. Works well enough for bucketing.
  const movetext = pgn.replace(/\{[^}]*\}/g, '').replace(/\[[^\]]+\]\n?/g, '')
  const moves = movetext.match(/\b[a-hNBRQKO][^\s.]*[+#]?/g)
  return moves ? moves.length : 0
}

function isDraw(g: RawGame): boolean {
  return (
    [
      'agreed',
      'repetition',
      'stalemate',
      '50move',
      'insufficient',
      'timevsinsufficient',
    ].includes(g.white.result) &&
    [
      'agreed',
      'repetition',
      'stalemate',
      '50move',
      'insufficient',
      'timevsinsufficient',
    ].includes(g.black.result)
  )
}

function avgRating(g: RawGame): number {
  return (g.white.rating + g.black.rating) / 2
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return (await res.json()) as T
}

function gameIdFromUrl(url: string): string | null {
  const m = url.match(/\/game\/live\/(\d+)/) ?? url.match(/\/(\d+)$/)
  return m ? m[1] : null
}

async function main() {
  const existing: SeedEntry[] = existsSync(GAMES_FILE)
    ? JSON.parse(readFileSync(GAMES_FILE, 'utf8'))
    : []
  const byId = new Map<string, SeedEntry>()
  for (const e of existing) byId.set(e.gameId, e)

  // Profile buckets — "got" starts at what we already have in `existing`.
  // We'll recount after scanning to decide when to stop.
  const buckets: Bucket[] = [
    {
      name: 'short (<20 plies)',
      want: 5,
      got: 0,
      match: (g) => (g.pgn ? plyCount(g.pgn) < 20 : false),
    },
    {
      name: 'long (>120 plies)',
      want: 5,
      got: 0,
      match: (g) => (g.pgn ? plyCount(g.pgn) > 120 : false),
    },
    {
      name: 'draws',
      want: 5,
      got: 0,
      match: (g) => isDraw(g),
    },
    {
      name: 'mid-rating (1200-2200 avg)',
      want: 6,
      got: 0,
      match: (g) => {
        const r = avgRating(g)
        return r >= 1200 && r <= 2200
      },
    },
    {
      name: 'baseline fill (anything else, up to 3/user)',
      want: 0,
      got: 0,
      match: () => true,
    },
  ]

  // Include explicit requests first.
  for (const e of EXPLICIT) {
    if (!byId.has(e.gameId)) byId.set(e.gameId, e)
  }

  // Scan each user's last few archives.
  for (const user of USERS) {
    const perUserAdded = new Map<string, number>()
    try {
      const { archives } = await getJson<{ archives: string[] }>(
        `https://api.chess.com/pub/player/${user}/games/archives`,
      )
      const archivesDesc = archives.slice().reverse().slice(0, 3)
      for (const archiveUrl of archivesDesc) {
        const { games } = await getJson<{ games: RawGame[] }>(archiveUrl)
        for (const g of games.slice().reverse()) {
          if (!g.accuracies || !g.pgn) continue
          const id = gameIdFromUrl(g.url)
          if (!id || byId.has(id)) continue

          // Only add this game if it fills a bucket that still needs more.
          const bucket = buckets.find((b) => b.want > b.got && b.match(g))
          if (!bucket) continue

          // Cap per-user contributions for the generic catch-all.
          const userCap = 3
          const addedForUser = perUserAdded.get(user) ?? 0
          if (bucket.name.startsWith('baseline') && addedForUser >= userCap)
            continue

          const opponent =
            g.white.username.toLowerCase() === user.toLowerCase()
              ? g.black.username
              : g.white.username
          const asColour =
            g.white.username.toLowerCase() === user.toLowerCase() ? 'W' : 'B'
          const plies = plyCount(g.pgn)
          byId.set(id, {
            username: user,
            gameId: id,
            note: `${g.time_class} ${plies}p vs ${opponent} (${asColour}) cc=${g.accuracies.white}/${g.accuracies.black} [${bucket.name}]`,
          })
          bucket.got += 1
          perUserAdded.set(user, addedForUser + 1)
        }
      }
    } catch (e) {
      console.error(`[${user}] failed:`, (e as Error).message)
    }
    console.log(
      `[${user}] buckets: ` +
        buckets
          .map((b) => `${b.name.split(' ')[0]}=${b.got}/${b.want}`)
          .join(' '),
    )
  }

  const merged = [...byId.values()]
  writeFileSync(GAMES_FILE, JSON.stringify(merged, null, 2) + '\n')
  console.log(`\nTotal entries: ${merged.length}`)
  console.log('Bucket fills:')
  for (const b of buckets) console.log(`  ${b.name}: ${b.got}/${b.want}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
