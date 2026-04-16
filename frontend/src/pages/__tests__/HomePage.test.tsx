import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HomePage } from '../HomePage'
import * as chessComApi from '../../services/chessComApi'

describe('HomePage', () => {
  it('renders a heading with the app name', () => {
    render(<HomePage />)
    expect(
      screen.getByRole('heading', { name: /anti-blunder club/i }),
    ).toBeInTheDocument()
  })

  it('renders the player search form', () => {
    render(<HomePage />)
    expect(
      screen.getByRole('textbox', { name: /username/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
  })

  it('fetches and displays games when searching for a player', async () => {
    const mockGames: chessComApi.ChessGame[] = [
      {
        url: 'https://www.chess.com/game/live/999',
        white: { username: 'hikaru', rating: 3200, result: 'win' },
        black: { username: 'opponent', rating: 3100, result: 'loss' },
        timeClass: 'bullet',
        endTime: 1711900000,
      },
    ]

    vi.spyOn(chessComApi, 'fetchPlayerGames').mockResolvedValue(mockGames)
    const user = userEvent.setup()

    render(<HomePage />)
    await user.type(
      screen.getByRole('textbox', { name: /username/i }),
      'hikaru',
    )
    await user.click(screen.getByRole('button', { name: /search/i }))

    await waitFor(() => {
      expect(screen.getByText(/hikaru/)).toBeInTheDocument()
    })
    expect(screen.getByText(/opponent/)).toBeInTheDocument()
    expect(chessComApi.fetchPlayerGames).toHaveBeenCalledWith('hikaru')
  })

  it('shows a loading state while fetching', async () => {
    let resolveGames!: (value: chessComApi.ChessGame[]) => void
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockImplementation(
      () => new Promise((resolve) => (resolveGames = resolve)),
    )
    const user = userEvent.setup()

    render(<HomePage />)
    await user.type(
      screen.getByRole('textbox', { name: /username/i }),
      'hikaru',
    )
    await user.click(screen.getByRole('button', { name: /search/i }))

    expect(screen.getByRole('button', { name: /searching/i })).toBeDisabled()

    resolveGames([])
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /search/i })).not.toBeDisabled()
    })
  })

  it('shows an error message when the fetch fails', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGames').mockRejectedValue(
      new Error('Player "nobody" not found'),
    )
    const user = userEvent.setup()

    render(<HomePage />)
    await user.type(
      screen.getByRole('textbox', { name: /username/i }),
      'nobody',
    )
    await user.click(screen.getByRole('button', { name: /search/i }))

    await waitFor(() => {
      expect(screen.getByText(/Player "nobody" not found/)).toBeInTheDocument()
    })
  })
})
