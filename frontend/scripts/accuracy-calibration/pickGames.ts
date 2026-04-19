// Quick corpus builder: for each username, pull the 2 most recent monthly
// archives and select up to `perUser` games that have an `accuracies` field
// and a PGN. Writes the merged list to games.json (preserving existing
// entries — dedup by gameId).

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const GAMES_FILE = resolve(__dirname, 'games.json')
const USERS = ['gaguera', 'igricart', 'diogomonte', 'gmkrikor', 'magnuscarlsen', 'hikaru', '22manudt']
const PER_USER = 3
const UA = 'anti-blunder-club-calibration (github.com/raphaelbp12/anti-blunder-club)'

interface SeedEntry { username: string; gameId: string; note?: string }
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

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return (await res.json()) as T
}

function gameIdFromUrl(url: string): string | null {
  const m = url.match(/\/game\/live\/(\d+)/) ?? url.match(/\/(\d+)$/)
  return m ? m[1] : null
}

async function pickFor(username: string): Promise<SeedEntry[]> {
  const { archives } = await getJson<{ archives: string[] }>(
    `https://api.chess.com/pub/player/${username}/games/archives`,
  )
  const picked: SeedEntry[] = []
  const seen = new Set<string>()
  // Walk archives newest-first.
  for (const archiveUrl of archives.slice().reverse()) {
    if (picked.length >= PER_USER) break
    const { games } = await getJson<{ games: RawGame[] }>(archiveUrl)
    // Newest games last in an archive.
    for (const g of games.slice().reverse()) {
      if (picked.length >= PER_USER) break
      if (!g.accuracies || !g.pgn) continue
      const id = gameIdFromUrl(g.url)
      if (!id || seen.has(id)) continue
      seen.add(id)
      const opponent = g.white.username.toLowerCase() === username.toLowerCase()
        ? g.black.username : g.white.username
      const asColour = g.white.username.toLowerCase() === username.toLowerCase() ? 'W' : 'B'
      picked.push({
        username,
        gameId: id,
        note: `${g.time_class} vs ${opponent} (${asColour}) cc=${g.accuracies.white}/${g.accuracies.black}`,
      })
    }
  }
  return picked
}

async function main() {
  const existing: SeedEntry[] = existsSync(GAMES_FILE)
    ? JSON.parse(readFileSync(GAMES_FILE, 'utf8'))
    : []
  const byId = new Map<string, SeedEntry>()
  for (const e of existing) byId.set(e.gameId, e)

  for (const user of USERS) {
    try {
      const picks = await pickFor(user)
      console.log(`[${user}] picked ${picks.length}`)
      for (const p of picks) {
        if (!byId.has(p.gameId)) byId.set(p.gameId, p)
      }
    } catch (e) {
      console.error(`[${user}] failed:`, (e as Error).message)
    }
  }

  const merged = [...byId.values()]
  writeFileSync(GAMES_FILE, JSON.stringify(merged, null, 2) + '\n')
  console.log(`\nTotal entries: ${merged.length}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
