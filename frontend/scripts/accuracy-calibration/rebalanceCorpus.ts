// Rebalance the corpus so no single user dominates while preserving
// bucket coverage (short / long / draw / mid-rating / baseline).
//
// Strategy:
//  1. Load current games.json.
//  2. For each user with > MAX_PER_USER games, keep the most diverse
//     subset (prefer one per bucket, then fill by ply-count spread).
//  3. Re-scan every user (deeper: up to 6 archives each) and add games
//     that fill outstanding bucket deficits, round-robin across users.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const GAMES_FILE = resolve(__dirname, 'games.json')
const FIXTURES_DIR = resolve(__dirname, 'fixtures')
const UA =
  'anti-blunder-club-calibration (github.com/raphaelbp12/anti-blunder-club)'

const MAX_PER_USER = 7
const ARCHIVES_TO_SCAN = 6

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
  'danilorogg1',
]

// Bucket targets for the final corpus.
const BUCKET_TARGETS = {
  short: 8, // < 30 plies
  long: 8, // > 120 plies
  draw: 6,
  mid: 10, // 1200-2200 avg rating
}

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

type BucketName = 'short' | 'long' | 'draw' | 'mid' | 'other'

const DRAW_RESULTS = new Set([
  'agreed',
  'repetition',
  'stalemate',
  '50move',
  'insufficient',
  'timevsinsufficient',
])

function plyCount(pgn: string): number {
  const movetext = pgn.replace(/\{[^}]*\}/g, '').replace(/\[[^\]]+\]\n?/g, '')
  const moves = movetext.match(/\b[a-hNBRQKO][^\s.]*[+#]?/g)
  return moves ? moves.length : 0
}

function bucketOf(g: RawGame): BucketName {
  const plies = g.pgn ? plyCount(g.pgn) : 0
  if (DRAW_RESULTS.has(g.white.result) && DRAW_RESULTS.has(g.black.result))
    return 'draw'
  if (plies < 30) return 'short'
  if (plies > 120) return 'long'
  const avg = (g.white.rating + g.black.rating) / 2
  if (avg >= 1200 && avg <= 2200) return 'mid'
  return 'other'
}

function parseNoteBucket(note: string | undefined): BucketName {
  if (!note) return 'other'
  if (/short/i.test(note)) return 'short'
  if (/long/i.test(note)) return 'long'
  if (/draws?/i.test(note)) return 'draw'
  if (/mid-rating/i.test(note)) return 'mid'
  return 'other'
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

function readCachedFixture(gameId: string): RawGame | null {
  const path = resolve(FIXTURES_DIR, `${gameId}.json`)
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as RawGame
  } catch {
    return null
  }
}

async function main() {
  const existing: SeedEntry[] = existsSync(GAMES_FILE)
    ? JSON.parse(readFileSync(GAMES_FILE, 'utf8'))
    : []

  // Step 1: trim overrepresented users.
  const byUser = new Map<string, SeedEntry[]>()
  for (const e of existing) {
    const arr = byUser.get(e.username) ?? []
    arr.push(e)
    byUser.set(e.username, arr)
  }

  const kept: SeedEntry[] = []
  const bucketCount = new Map<BucketName, number>([
    ['short', 0],
    ['long', 0],
    ['draw', 0],
    ['mid', 0],
    ['other', 0],
  ])

  for (const [user, entries] of byUser) {
    if (entries.length <= MAX_PER_USER) {
      kept.push(...entries)
      continue
    }
    // Prefer one per bucket, then fill up to MAX_PER_USER from the rest.
    const byBucket = new Map<BucketName, SeedEntry[]>()
    for (const e of entries) {
      const cached = readCachedFixture(e.gameId)
      const b = cached ? bucketOf(cached) : parseNoteBucket(e.note)
      const arr = byBucket.get(b) ?? []
      arr.push(e)
      byBucket.set(b, arr)
    }
    const picks: SeedEntry[] = []
    // Round-robin across buckets until we hit the cap.
    const bucketOrder: BucketName[] = ['short', 'long', 'draw', 'mid', 'other']
    let progress = true
    while (picks.length < MAX_PER_USER && progress) {
      progress = false
      for (const b of bucketOrder) {
        if (picks.length >= MAX_PER_USER) break
        const pool = byBucket.get(b)
        if (pool && pool.length > 0) {
          picks.push(pool.shift()!)
          progress = true
        }
      }
    }
    kept.push(...picks)
    console.log(
      `[trim] ${user}: ${entries.length} -> ${picks.length} (kept diverse set)`,
    )
  }

  // Count buckets after trimming.
  for (const e of kept) {
    const cached = readCachedFixture(e.gameId)
    const b = cached ? bucketOf(cached) : parseNoteBucket(e.note)
    bucketCount.set(b, (bucketCount.get(b) ?? 0) + 1)
  }

  console.log(
    `After trim: ${kept.length} games | ` +
      Array.from(bucketCount.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join(' '),
  )

  const keptIds = new Set(kept.map((e) => e.gameId))
  const userCount = new Map<string, number>()
  for (const e of kept)
    userCount.set(e.username, (userCount.get(e.username) ?? 0) + 1)

  // Step 2: re-scan users round-robin for bucket deficits.
  // Pre-fetch archive indexes.
  const userArchives = new Map<string, string[]>()
  for (const user of USERS) {
    try {
      const { archives } = await getJson<{ archives: string[] }>(
        `https://api.chess.com/pub/player/${user}/games/archives`,
      )
      userArchives.set(
        user,
        archives.slice().reverse().slice(0, ARCHIVES_TO_SCAN),
      )
    } catch (err) {
      console.error(`[${user}] archive list failed:`, (err as Error).message)
    }
  }

  // For each user, lazy-iterate their games (newest first) so we can do
  // round-robin picking across users.
  async function* userGames(user: string): AsyncGenerator<RawGame> {
    const archives = userArchives.get(user) ?? []
    for (const url of archives) {
      try {
        const { games } = await getJson<{ games: RawGame[] }>(url)
        for (const g of games.slice().reverse()) yield g
      } catch (err) {
        console.error(`[${user}] ${url} failed:`, (err as Error).message)
      }
    }
  }

  const iterators = new Map<string, AsyncGenerator<RawGame>>()
  for (const user of USERS) iterators.set(user, userGames(user))

  const deficits = (): Record<BucketName, number> => ({
    short: Math.max(0, BUCKET_TARGETS.short - (bucketCount.get('short') ?? 0)),
    long: Math.max(0, BUCKET_TARGETS.long - (bucketCount.get('long') ?? 0)),
    draw: Math.max(0, BUCKET_TARGETS.draw - (bucketCount.get('draw') ?? 0)),
    mid: Math.max(0, BUCKET_TARGETS.mid - (bucketCount.get('mid') ?? 0)),
    other: 0,
  })

  // Round-robin: each pass, every user may contribute at most one game
  // (and only if they haven't hit MAX_PER_USER).
  let keepGoing = true
  while (keepGoing) {
    keepGoing = false
    const d = deficits()
    const totalDeficit = d.short + d.long + d.draw + d.mid
    if (totalDeficit === 0) break

    for (const user of USERS) {
      if ((userCount.get(user) ?? 0) >= MAX_PER_USER) continue
      const it = iterators.get(user)!
      // Advance this user's iterator until we find a game that helps a
      // deficient bucket, or exhaust them.
      let found = false
      // Limit per-iteration advancement to avoid starving other users.
      for (let i = 0; i < 30; i++) {
        const next = await it.next()
        if (next.done) break
        const g = next.value
        if (!g.accuracies || !g.pgn) continue
        const id = gameIdFromUrl(g.url)
        if (!id || keptIds.has(id)) continue
        const b = bucketOf(g)
        if (b === 'other') continue
        if ((deficits()[b] ?? 0) <= 0) continue
        const opp =
          g.white.username.toLowerCase() === user.toLowerCase()
            ? g.black.username
            : g.white.username
        const col =
          g.white.username.toLowerCase() === user.toLowerCase() ? 'W' : 'B'
        kept.push({
          username: user,
          gameId: id,
          note: `${g.time_class} ${plyCount(g.pgn)}p vs ${opp} (${col}) cc=${g.accuracies.white}/${g.accuracies.black} [${b}]`,
        })
        keptIds.add(id)
        userCount.set(user, (userCount.get(user) ?? 0) + 1)
        bucketCount.set(b, (bucketCount.get(b) ?? 0) + 1)
        found = true
        keepGoing = true
        break
      }
      if (found) {
        // Early exit if all deficits satisfied.
        const d2 = deficits()
        if (d2.short + d2.long + d2.draw + d2.mid === 0) {
          keepGoing = false
          break
        }
      }
    }
  }

  writeFileSync(GAMES_FILE, JSON.stringify(kept, null, 2) + '\n')

  console.log(`\nFinal: ${kept.length} games`)
  const finalByUser = new Map<string, number>()
  for (const e of kept)
    finalByUser.set(e.username, (finalByUser.get(e.username) ?? 0) + 1)
  console.log('Per-user:')
  for (const [u, c] of Array.from(finalByUser.entries()).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`  ${u}: ${c}`)
  }
  console.log('Per-bucket:')
  for (const [k, v] of bucketCount.entries()) console.log(`  ${k}: ${v}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
