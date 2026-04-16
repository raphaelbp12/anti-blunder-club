import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MatchList } from '../MatchList'
import type { ChessGame } from '../../services/chessComApi'

const mockGames: ChessGame[] = [
  {
    url: 'https://www.chess.com/game/live/111',
    white: { username: 'alice', rating: 1500, result: 'win' },
    black: { username: 'bob', rating: 1400, result: 'loss' },
    timeClass: 'blitz',
    endTime: 1711900000,
    accuracies: { white: 95.5, black: 88.2 },
  },
  {
    url: 'https://www.chess.com/game/live/222',
    white: { username: 'charlie', rating: 1600, result: 'draw' },
    black: { username: 'alice', rating: 1500, result: 'draw' },
    timeClass: 'rapid',
    endTime: 1711910000,
  },
]

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('MatchList', () => {
  it('renders an empty state when there are no games', () => {
    renderWithRouter(<MatchList games={[]} username="alice" />)
    expect(screen.getByText(/no matches found/i)).toBeInTheDocument()
  })

  it('renders player usernames for each game', () => {
    renderWithRouter(<MatchList games={mockGames} username="alice" />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('alice')
    expect(items[0]).toHaveTextContent('bob')
    expect(items[1]).toHaveTextContent('charlie')
  })

  it('renders player ratings', () => {
    renderWithRouter(<MatchList games={mockGames} username="alice" />)
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('1500')
    expect(items[0]).toHaveTextContent('1400')
  })

  it('renders the time class for each game', () => {
    renderWithRouter(<MatchList games={mockGames} username="alice" />)
    expect(screen.getByText(/blitz/i)).toBeInTheDocument()
    expect(screen.getByText(/rapid/i)).toBeInTheDocument()
  })

  it('renders accuracies when available', () => {
    renderWithRouter(<MatchList games={mockGames} username="alice" />)
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('95.5')
    expect(items[0]).toHaveTextContent('88.2')
  })

  it('renders dashes when accuracies are missing', () => {
    renderWithRouter(<MatchList games={mockGames} username="alice" />)
    const items = screen.getAllByRole('listitem')
    expect(items[1]).toHaveTextContent('—')
  })

  it('renders links to the match detail page', () => {
    renderWithRouter(<MatchList games={mockGames} username="alice" />)
    const links = screen.getAllByRole('link', { name: /view/i })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', '/player/alice/match/111')
    expect(links[1]).toHaveAttribute('href', '/player/alice/match/222')
  })
})
