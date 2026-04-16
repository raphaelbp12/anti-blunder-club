import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MatchPage } from '../MatchPage'
import * as chessComApi from '../../services/chessComApi'
import type { ChessGame } from '../../services/chessComApi'

const mockGame: ChessGame = {
  url: 'https://www.chess.com/game/live/456',
  white: { username: 'hikaru', rating: 3200, result: 'win' },
  black: { username: 'magnus', rating: 3100, result: 'loss' },
  timeClass: 'bullet',
  endTime: 1711900000,
  accuracies: { white: 95.5, black: 88.2 },
}

const mockGameWithoutAccuracies: ChessGame = {
  url: 'https://www.chess.com/game/live/789',
  white: { username: 'hikaru', rating: 3200, result: 'win' },
  black: { username: 'magnus', rating: 3100, result: 'loss' },
  timeClass: 'bullet',
  endTime: 1711900000,
}

function renderMatchPage(state?: ChessGame) {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/player/hikaru/match/456',
          state: state ?? null,
        },
      ]}
    >
      <Routes>
        <Route path="/player/:username/match/:gameId" element={<MatchPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('MatchPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders match details from router state', () => {
    renderMatchPage(mockGame)

    expect(screen.getByText(/hikaru/)).toBeInTheDocument()
    expect(screen.getByText(/magnus/)).toBeInTheDocument()
    expect(screen.getByText(/3200/)).toBeInTheDocument()
    expect(screen.getByText(/3100/)).toBeInTheDocument()
    expect(screen.getByText(/bullet/i)).toBeInTheDocument()
  })

  it('renders player results', () => {
    renderMatchPage(mockGame)

    expect(screen.getByText(/win/i)).toBeInTheDocument()
    expect(screen.getByText(/loss/i)).toBeInTheDocument()
  })

  it('renders accuracies when available', () => {
    renderMatchPage(mockGame)

    expect(screen.getByText(/95\.5/)).toBeInTheDocument()
    expect(screen.getByText(/88\.2/)).toBeInTheDocument()
  })

  it('renders dashes when accuracies are missing', () => {
    renderMatchPage(mockGameWithoutAccuracies)

    const accuracyElements = screen.getAllByText(/Accuracy:/)
    expect(accuracyElements).toHaveLength(2)
    accuracyElements.forEach((el) => {
      expect(el).toHaveTextContent('—')
    })
  })

  it('renders a link to the chess.com game', () => {
    renderMatchPage(mockGame)

    const link = screen.getByRole('link', { name: /view on chess\.com/i })
    expect(link).toHaveAttribute('href', 'https://www.chess.com/game/live/456')
  })

  it('fetches from the API when no router state is provided', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGame').mockResolvedValue(mockGame)

    renderMatchPage()

    expect(screen.getByText(/loading/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(/hikaru/)).toBeInTheDocument()
    })

    expect(chessComApi.fetchPlayerGame).toHaveBeenCalledWith('hikaru', '456')
  })

  it('shows an error when the API fetch fails', async () => {
    vi.spyOn(chessComApi, 'fetchPlayerGame').mockRejectedValue(
      new Error('Game not found'),
    )

    renderMatchPage()

    await waitFor(() => {
      expect(screen.getByText(/game not found/i)).toBeInTheDocument()
      expect(
        screen.queryByRole('link', { name: /back to matches/i }),
      ).not.toBeInTheDocument()
    })
  })
})
