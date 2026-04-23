// SPDX-License-Identifier: GPL-3.0-or-later
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useAnalysisQueueStore } from '../../stores/useAnalysisQueueStore'
import { BatchAnalysisProgress } from '../BatchAnalysisProgress'

function reset() {
  useAnalysisQueueStore.setState({
    pending: [],
    running: [],
    batchTotal: 0,
    batchDone: 0,
  })
}

describe('<BatchAnalysisProgress>', () => {
  afterEach(reset)

  it('renders nothing when the queue is empty', () => {
    const { container } = render(<BatchAnalysisProgress />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows batch progress and a cancel button when work is in flight', async () => {
    const cancelAll = vi.fn()
    useAnalysisQueueStore.setState({
      pending: [
        {
          gameId: 'b',
          pgn: '',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          game: {} as any,
        },
      ],
      running: ['a'],
      batchTotal: 5,
      batchDone: 3,
      cancelAll,
    })
    render(<BatchAnalysisProgress />)
    expect(screen.getByText(/3\s*\/\s*5/)).toBeInTheDocument()
    expect(screen.getByText(/1 running/i)).toBeInTheDocument()
    expect(screen.getByText(/1 queued/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /cancel all/i }))
    expect(cancelAll).toHaveBeenCalled()
  })

  it('renders the progress bar width proportional to batchDone/batchTotal', () => {
    useAnalysisQueueStore.setState({
      pending: [],
      running: ['x'],
      batchTotal: 4,
      batchDone: 1,
    })
    render(<BatchAnalysisProgress />)
    const bar = screen.getByTestId('batch-progress-bar-fill')
    expect(bar).toHaveStyle({ width: '25%' })
  })
})
