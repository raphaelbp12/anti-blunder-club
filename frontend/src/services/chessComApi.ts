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
}

interface GamesResponse {
  games: RawGame[]
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

  return games.map((game) => ({
    url: game.url,
    white: game.white,
    black: game.black,
    timeClass: game.time_class,
    endTime: game.end_time,
  }))
}
