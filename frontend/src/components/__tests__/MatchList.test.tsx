import { render, screen } from '@testing-library/react'
import { MatchList } from '../MatchList'
import type { ChessGame } from '../../services/chessComApi'

const mockGames: ChessGame[] = [
  {
    url: 'https://www.chess.com/game/live/111',
    white: { username: 'alice', rating: 1500, result: 'win' },
    black: { username: 'bob', rating: 1400, result: 'loss' },
    timeClass: 'blitz',
    endTime: 1711900000,
  },
  {
    url: 'https://www.chess.com/game/live/222',
    white: { username: 'charlie', rating: 1600, result: 'draw' },
    black: { username: 'alice', rating: 1500, result: 'draw' },
    timeClass: 'rapid',
    endTime: 1711910000,
  },
]

describe('MatchList', () => {
  it('renders an empty state when there are no games', () => {
    render(<MatchList games={[]} />)
    expect(screen.getByText(/no matches found/i)).toBeInTheDocument()
  })

  it('renders player usernames for each game', () => {
    render(<MatchList games={mockGames} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('alice')
    expect(items[0]).toHaveTextContent('bob')
    expect(items[1]).toHaveTextContent('charlie')
  })

  it('renders player ratings', () => {
    render(<MatchList games={mockGames} />)
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('1500')
    expect(items[0]).toHaveTextContent('1400')
  })

  it('renders the time class for each game', () => {
    render(<MatchList games={mockGames} />)
    expect(screen.getByText(/blitz/i)).toBeInTheDocument()
    expect(screen.getByText(/rapid/i)).toBeInTheDocument()
  })

  it('renders links to chess.com games', () => {
    render(<MatchList games={mockGames} />)
    const links = screen.getAllByRole('link', { name: /view/i })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute(
      'href',
      'https://www.chess.com/game/live/111',
    )
    expect(links[1]).toHaveAttribute(
      'href',
      'https://www.chess.com/game/live/222',
    )
  })
})
