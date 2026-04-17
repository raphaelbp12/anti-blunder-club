import type { ChessGame } from '../services/chessComApi'
import { MatchList } from './MatchList'

interface GamesTabContentProps {
  games: ChessGame[]
  username: string
}

export function GamesTabContent({ games, username }: GamesTabContentProps) {
  return <MatchList games={games} username={username} />
}
