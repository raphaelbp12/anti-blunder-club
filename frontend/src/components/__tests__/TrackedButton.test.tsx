import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { trackEvent } from '../../utils/analytics'
import { TrackedButton } from '../TrackedButton'

vi.mock('../../utils/analytics', () => ({
  trackEvent: vi.fn(),
  trackPageView: vi.fn(),
}))

describe('TrackedButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a button with children', () => {
    render(<TrackedButton eventName="theme_toggle">Click me</TrackedButton>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('fires analytics event on click', async () => {
    const user = userEvent.setup()
    render(
      <TrackedButton
        eventName="theme_toggle"
        eventParams={{ new_theme: 'dark' }}
      >
        Toggle
      </TrackedButton>,
    )

    await user.click(screen.getByRole('button', { name: 'Toggle' }))
    expect(trackEvent).toHaveBeenCalledWith('theme_toggle', {
      new_theme: 'dark',
    })
  })

  it('calls original onClick handler', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(
      <TrackedButton eventName="theme_toggle" onClick={onClick}>
        Toggle
      </TrackedButton>,
    )

    await user.click(screen.getByRole('button', { name: 'Toggle' }))
    expect(onClick).toHaveBeenCalled()
  })

  it('forwards button HTML attributes', () => {
    render(
      <TrackedButton
        eventName="player_search"
        type="submit"
        disabled
        aria-label="Search"
        className="test-class"
      >
        Search
      </TrackedButton>,
    )

    const button = screen.getByRole('button', { name: 'Search' })
    expect(button).toHaveAttribute('type', 'submit')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('test-class')
  })

  it('does not fire event when disabled', async () => {
    const user = userEvent.setup()
    render(
      <TrackedButton eventName="theme_toggle" disabled>
        Toggle
      </TrackedButton>,
    )

    await user.click(screen.getByRole('button', { name: 'Toggle' }))
    expect(trackEvent).not.toHaveBeenCalled()
  })
})
