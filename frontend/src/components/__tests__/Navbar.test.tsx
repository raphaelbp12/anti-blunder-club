import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { useThemeStore } from '../../hooks/useThemeStore'
import { trackEvent } from '../../utils/analytics'
import { Navbar } from '../Navbar'

vi.mock('../../utils/analytics', () => ({
  trackEvent: vi.fn(),
}))

function renderNavbar(username?: string) {
  return render(
    <MemoryRouter>
      <Navbar username={username} />
    </MemoryRouter>,
  )
}

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useThemeStore.setState({ isDark: true })
  })

  it('renders a navigation landmark', () => {
    renderNavbar()
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('always renders a Home link pointing to /', () => {
    renderNavbar()
    const link = screen.getByRole('link', { name: /home/i })
    expect(link).toHaveAttribute('href', '/')
  })

  it('renders Dashboard link when username is provided', () => {
    renderNavbar('hikaru')
    const link = screen.getByRole('link', { name: /dashboard/i })
    expect(link).toHaveAttribute('href', '/player/hikaru')
  })

  it('does not render Dashboard link when no username', () => {
    renderNavbar()
    expect(
      screen.queryByRole('link', { name: /dashboard/i }),
    ).not.toBeInTheDocument()
  })

  it('renders a theme toggle button', () => {
    renderNavbar()
    expect(
      screen.getByRole('button', { name: /toggle theme/i }),
    ).toBeInTheDocument()
  })

  it('clicking toggle flips isDark in the store', async () => {
    renderNavbar()
    const user = userEvent.setup()

    expect(useThemeStore.getState().isDark).toBe(true)
    await user.click(screen.getByRole('button', { name: /toggle theme/i }))
    expect(useThemeStore.getState().isDark).toBe(false)
  })

  it('fires nav_click event when Home link is clicked', async () => {
    renderNavbar()
    const user = userEvent.setup()
    await user.click(screen.getByRole('link', { name: /home/i }))
    expect(trackEvent).toHaveBeenCalledWith('nav_click', {
      link_name: 'Home',
      destination: '/',
    })
  })

  it('fires nav_click event when Dashboard link is clicked', async () => {
    renderNavbar('hikaru')
    const user = userEvent.setup()
    await user.click(screen.getByRole('link', { name: /dashboard/i }))
    expect(trackEvent).toHaveBeenCalledWith('nav_click', {
      link_name: 'Dashboard',
      destination: '/player/hikaru',
    })
  })

  it('fires theme_toggle event with new_theme param', async () => {
    renderNavbar()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /toggle theme/i }))
    expect(trackEvent).toHaveBeenCalledWith('theme_toggle', {
      new_theme: 'light',
    })
  })

  it('always renders an About link pointing to /about', () => {
    renderNavbar()
    const link = screen.getByRole('link', { name: /about/i })
    expect(link).toHaveAttribute('href', '/about')
  })

  it('fires about_nav_clicked when About link is clicked', async () => {
    renderNavbar()
    const user = userEvent.setup()
    await user.click(screen.getByRole('link', { name: /about/i }))
    expect(trackEvent).toHaveBeenCalledWith('about_nav_clicked', undefined)
  })
})
