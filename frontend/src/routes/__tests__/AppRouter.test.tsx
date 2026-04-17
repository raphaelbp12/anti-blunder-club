import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppRouter } from '../AppRouter'
import { usePlayerGamesStore } from '../../stores/usePlayerGamesStore'
import * as chessComApi from '../../services/chessComApi'

vi.mock('../../utils/analytics', () => ({
  trackEvent: vi.fn(),
}))

const mockGames: chessComApi.ChessGame[] = [
  {
    url: 'https://www.chess.com/game/live/111',
    white: { username: 'hikaru', rating: 3200, result: 'win' },
    black: { username: 'opponent', rating: 3100, result: 'loss' },
    timeClass: 'bullet',
    endTime: 1711900000,
    accuracies: { white: 90.0, black: 75.0 },
  },
]

describe('AppRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    usePlayerGamesStore.setState({
      gamesByUsername: { hikaru: mockGames },
      isLoading: false,
      error: null,
    })
  })

  it('renders the home page on the root route', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRouter />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('heading', { name: /anti-blunder club/i }),
    ).toBeInTheDocument()
  })

  it('renders the player page for a player route', () => {
    render(
      <MemoryRouter initialEntries={['/player/hikaru']}>
        <AppRouter />
      </MemoryRouter>,
    )
    expect(screen.getByRole('tablist')).toBeInTheDocument()
  })

  it('renders the match page for a match route', () => {
    const gameState = {
      url: 'https://www.chess.com/game/live/123',
      white: { username: 'hikaru', rating: 3200, result: 'win' },
      black: { username: 'opponent', rating: 3100, result: 'loss' },
      timeClass: 'bullet',
      endTime: 1711900000,
    }
    render(
      <MemoryRouter
        initialEntries={[
          { pathname: '/player/hikaru/match/123', state: gameState },
        ]}
      >
        <AppRouter />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('heading', { name: /match details/i }),
    ).toBeInTheDocument()
  })

  it('redirects /player/:username/analysis to ?tab=accuracy', async () => {
    render(
      <MemoryRouter initialEntries={['/player/hikaru/analysis']}>
        <AppRouter />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Accuracy' })).toHaveAttribute(
        'aria-selected',
        'true',
      )
    })
  })

  it('renders the not-found page for unknown routes', () => {
    render(
      <MemoryRouter initialEntries={['/unknown-route']}>
        <AppRouter />
      </MemoryRouter>,
    )
    expect(screen.getByText(/page not found/i)).toBeInTheDocument()
  })
})
