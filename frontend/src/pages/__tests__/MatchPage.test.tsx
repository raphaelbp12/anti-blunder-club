import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MatchPage } from '../MatchPage'
import * as chessComApi from '../../services/chessComApi'
import type { ChessGame } from '../../services/chessComApi'
import { useAnalysisStore } from '../../stores/useAnalysisStore'
import type { AnalyzeGameResult } from '../../services/analysis/analyzeGame'
import { Classification } from '../../services/analysis/constants/Classification'
import { PieceColour } from '../../services/analysis/constants/PieceColour'
import { summarizeClassifications } from '../../services/analysis/summarizeClassifications'

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
    useAnalysisStore.setState({ byGameId: {} })
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

  describe('engine analysis section', () => {
    const gameWithPgn: ChessGame = {
      ...mockGame,
      pgn: '[Event "Test"]\n\n1. e4 e5 2. Nf3 *',
    }

    const doneResult: AnalyzeGameResult = {
      moves: [
        {
          san: 'e4',
          uci: 'e2e4',
          fen: 'x',
          moveColour: PieceColour.WHITE,
          classification: Classification.BEST,
          accuracy: 99,
        },
        {
          san: 'e5',
          uci: 'e7e5',
          fen: 'y',
          moveColour: PieceColour.BLACK,
          classification: Classification.EXCELLENT,
          accuracy: 92,
        },
      ],
      accuracy: { white: 98.4, black: 91.2 },
      analysis: {} as AnalyzeGameResult['analysis'],
    }

    it('does not render the analysis section when the game has no PGN', () => {
      renderMatchPage(mockGame)
      expect(
        screen.queryByLabelText(/engine analysis/i),
      ).not.toBeInTheDocument()
    })

    it('shows the Analyze button when idle', () => {
      renderMatchPage(gameWithPgn)
      expect(
        screen.getByRole('button', { name: /analyze game/i }),
      ).toBeInTheDocument()
    })

    it('shows progress text while running', () => {
      useAnalysisStore.setState({
        byGameId: { '456': { status: 'running', progress: 0.42 } },
      })
      renderMatchPage(gameWithPgn)
      expect(screen.getByText(/analyzing… 42%/i)).toBeInTheDocument()
    })

    it('shows accuracies and a details toggle when done', async () => {
      useAnalysisStore.setState({
        byGameId: {
          '456': {
            status: 'done',
            result: doneResult,
            summary: summarizeClassifications(doneResult.moves),
            accuracy: doneResult.accuracy,
            durationMs: 1234,
            analysedAt: 1,
          },
        },
      })
      renderMatchPage(gameWithPgn)

      expect(screen.getByText(/98\.4/)).toBeInTheDocument()
      expect(screen.getByText(/91\.2/)).toBeInTheDocument()

      const toggle = screen.getByRole('button', { name: /show details/i })
      expect(screen.queryByText(/"classification"/)).not.toBeInTheDocument()

      await userEvent.click(toggle)
      expect(screen.getByText(/"classification"/)).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /hide details/i }),
      ).toBeInTheDocument()
    })

    it('shows the White/Black classification summary columns when done', () => {
      useAnalysisStore.setState({
        byGameId: {
          '456': {
            status: 'done',
            result: doneResult,
            summary: summarizeClassifications(doneResult.moves),
            accuracy: doneResult.accuracy,
            durationMs: 1234,
            analysedAt: 1,
          },
        },
      })
      renderMatchPage(gameWithPgn)

      const white = screen.getByTestId('classification-column-white')
      const black = screen.getByTestId('classification-column-black')
      expect(white).toBeInTheDocument()
      expect(black).toBeInTheDocument()
      // White played one BEST move, Black played one EXCELLENT move.
      expect(white).toHaveTextContent('Best')
      expect(black).toHaveTextContent('Excellent')
    })

    it('shows an error and Retry button when failed', async () => {
      useAnalysisStore.setState({
        byGameId: { '456': { status: 'error', error: 'engine crashed' } },
      })
      renderMatchPage(gameWithPgn)

      expect(
        screen.getByText(/analysis failed: engine crashed/i),
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    it('calls startAnalysis when Analyze is clicked', async () => {
      const startSpy = vi
        .spyOn(useAnalysisStore.getState(), 'startAnalysis')
        .mockResolvedValue()
      // Rebind the store's action so the component sees the spy.
      useAnalysisStore.setState({ startAnalysis: startSpy })

      renderMatchPage(gameWithPgn)
      await userEvent.click(
        screen.getByRole('button', { name: /analyze game/i }),
      )

      expect(startSpy).toHaveBeenCalledWith('456', gameWithPgn.pgn, {
        game: gameWithPgn,
      })
    })
  })
})
