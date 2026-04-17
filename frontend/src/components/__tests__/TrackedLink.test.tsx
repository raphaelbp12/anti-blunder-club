import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { trackEvent } from '../../utils/analytics'
import { TrackedLink } from '../TrackedLink'

vi.mock('../../utils/analytics', () => ({
  trackEvent: vi.fn(),
}))

describe('TrackedLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a link with children and correct href', () => {
    render(
      <MemoryRouter>
        <TrackedLink
          to="/player/hikaru"
          eventName="nav_click"
          eventParams={{ link_name: 'Matches' }}
        >
          Matches
        </TrackedLink>
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: 'Matches' })
    expect(link).toHaveAttribute('href', '/player/hikaru')
  })

  it('fires analytics event on click', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <TrackedLink
          to="/"
          eventName="nav_click"
          eventParams={{ link_name: 'Home', destination: '/' }}
        >
          Home
        </TrackedLink>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('link', { name: 'Home' }))
    expect(trackEvent).toHaveBeenCalledWith('nav_click', {
      link_name: 'Home',
      destination: '/',
    })
  })

  it('calls original onClick handler', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <TrackedLink to="/" eventName="nav_click" onClick={onClick}>
          Home
        </TrackedLink>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('link', { name: 'Home' }))
    expect(onClick).toHaveBeenCalled()
  })

  it('forwards Link props', () => {
    render(
      <MemoryRouter>
        <TrackedLink
          to="/player/hikaru"
          eventName="nav_click"
          className="test-class"
        >
          Matches
        </TrackedLink>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Matches' })).toHaveClass(
      'test-class',
    )
  })
})
