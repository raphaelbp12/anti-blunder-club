import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ChessGame } from '../../services/chessComApi'
import { GamesTabContent } from '../GamesTabContent'

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
    white: { username: 'alice', rating: 1510, result: 'loss' },
    black: { username: 'charlie', rating: 1600, result: 'win' },
    timeClass: 'rapid',
    endTime: 1711900100,
  },
]

describe('GamesTabContent', () => {
  it('renders all provided games', () => {
    render(
      <MemoryRouter>
        <GamesTabContent games={mockGames} username="alice" />
      </MemoryRouter>,
    )

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('shows empty state when no games are provided', () => {
    render(
      <MemoryRouter>
        <GamesTabContent games={[]} username="alice" />
      </MemoryRouter>,
    )

    expect(screen.getByText(/no matches found/i)).toBeInTheDocument()
  })
})
