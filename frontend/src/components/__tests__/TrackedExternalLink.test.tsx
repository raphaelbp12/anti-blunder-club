import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { trackEvent } from '../../utils/analytics'
import { TrackedExternalLink } from '../TrackedExternalLink'

vi.mock('../../utils/analytics', () => ({
  trackEvent: vi.fn(),
  trackPageView: vi.fn(),
}))

describe('TrackedExternalLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders an anchor with children and href', () => {
    render(
      <TrackedExternalLink
        href="https://chess.com/game/123"
        eventName="external_link_click"
      >
        View on Chess.com
      </TrackedExternalLink>,
    )

    const link = screen.getByRole('link', { name: 'View on Chess.com' })
    expect(link).toHaveAttribute('href', 'https://chess.com/game/123')
  })

  it('fires analytics event on click', async () => {
    const user = userEvent.setup()
    render(
      <TrackedExternalLink
        href="https://chess.com/game/123"
        eventName="external_link_click"
        eventParams={{ url: 'https://chess.com/game/123' }}
      >
        View on Chess.com
      </TrackedExternalLink>,
    )

    await user.click(screen.getByRole('link', { name: 'View on Chess.com' }))
    expect(trackEvent).toHaveBeenCalledWith('external_link_click', {
      url: 'https://chess.com/game/123',
    })
  })

  it('calls original onClick handler', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(
      <TrackedExternalLink
        href="https://chess.com"
        eventName="external_link_click"
        onClick={onClick}
      >
        Link
      </TrackedExternalLink>,
    )

    await user.click(screen.getByRole('link', { name: 'Link' }))
    expect(onClick).toHaveBeenCalled()
  })

  it('forwards anchor attributes', () => {
    render(
      <TrackedExternalLink
        href="https://chess.com"
        eventName="external_link_click"
        target="_blank"
        rel="noopener noreferrer"
        className="test-class"
      >
        Link
      </TrackedExternalLink>,
    )

    const link = screen.getByRole('link', { name: 'Link' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveClass('test-class')
  })
})
