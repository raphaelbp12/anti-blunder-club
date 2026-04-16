export interface ChessPlayer {
  username: string
  rating: number
  result: string
}

export interface ChessGame {
  url: string
  white: ChessPlayer
  black: ChessPlayer
  timeClass: string
  endTime: number
  accuracies?: { white: number; black: number }
}

export interface PlayerProfile {
  username: string
  avatar?: string
}

export interface TimeControlStats {
  last?: { rating: number }
}

export interface PlayerStats {
  chess_rapid?: TimeControlStats
  chess_blitz?: TimeControlStats
  chess_bullet?: TimeControlStats
  chess_daily?: TimeControlStats
}

interface ArchivesResponse {
  archives: string[]
}

interface RawGame {
  url: string
  white: ChessPlayer
  black: ChessPlayer
  time_class: string
  end_time: number
  accuracies?: { white: number; black: number }
}

interface GamesResponse {
  games: RawGame[]
}

export function extractGameId(url: string): string {
  return url.split('/').pop()!
}

export async function fetchPlayerGames(username: string): Promise<ChessGame[]> {
  const archivesRes = await fetch(
    `https://api.chess.com/pub/player/${username}/games/archives`,
  )

  if (!archivesRes.ok) {
    throw new Error(`Player "${username}" not found`)
  }

  const { archives } = (await archivesRes.json()) as ArchivesResponse

  if (archives.length === 0) {
    throw new Error('No game archives found')
  }

  const lastArchiveUrl = archives[archives.length - 1]
  const gamesRes = await fetch(lastArchiveUrl)
  const { games } = (await gamesRes.json()) as GamesResponse

  return games.map(mapRawGame)
}

export async function fetchPlayerGame(
  username: string,
  gameId: string,
): Promise<ChessGame> {
  const archivesRes = await fetch(
    `https://api.chess.com/pub/player/${username}/games/archives`,
  )

  if (!archivesRes.ok) {
    throw new Error(`Player "${username}" not found`)
  }

  const { archives } = (await archivesRes.json()) as ArchivesResponse

  for (let i = archives.length - 1; i >= 0; i--) {
    const gamesRes = await fetch(archives[i])
    const { games } = (await gamesRes.json()) as GamesResponse
    const match = games.find((game) => extractGameId(game.url) === gameId)
    if (match) {
      return mapRawGame(match)
    }
  }

  throw new Error('Game not found')
}

const TIME_CONTROLS = [
  'chess_rapid',
  'chess_blitz',
  'chess_bullet',
  'chess_daily',
] as const

export function getHighestRating(stats: PlayerStats): number | null {
  const ratings = TIME_CONTROLS.map((tc) => stats[tc]?.last?.rating).filter(
    (r): r is number => r !== undefined,
  )

  return ratings.length > 0 ? Math.max(...ratings) : null
}

export async function fetchPlayerProfile(
  username: string,
): Promise<PlayerProfile> {
  const res = await fetch(`https://api.chess.com/pub/player/${username}`)

  if (!res.ok) {
    throw new Error(`Player "${username}" not found`)
  }

  const data = await res.json()
  return { username: data.username, avatar: data.avatar }
}

export async function fetchPlayerStats(username: string): Promise<PlayerStats> {
  const res = await fetch(`https://api.chess.com/pub/player/${username}/stats`)

  if (!res.ok) {
    throw new Error(`Stats for "${username}" not found`)
  }

  return (await res.json()) as PlayerStats
}

function mapRawGame(game: RawGame): ChessGame {
  return {
    url: game.url,
    white: game.white,
    black: game.black,
    timeClass: game.time_class,
    endTime: game.end_time,
    accuracies: game.accuracies,
  }
}
