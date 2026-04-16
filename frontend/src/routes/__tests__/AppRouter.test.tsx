import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppRouter } from '../AppRouter'
import { usePlayerGamesStore } from '../../stores/usePlayerGamesStore'

describe('AppRouter', () => {
  beforeEach(() => {
    usePlayerGamesStore.setState({
      gamesByUsername: { hikaru: [] },
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
    expect(screen.getByRole('heading', { name: /hikaru/i })).toBeInTheDocument()
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

  it('renders the not-found page for unknown routes', () => {
    render(
      <MemoryRouter initialEntries={['/unknown-route']}>
        <AppRouter />
      </MemoryRouter>,
    )
    expect(screen.getByText(/page not found/i)).toBeInTheDocument()
  })
})
