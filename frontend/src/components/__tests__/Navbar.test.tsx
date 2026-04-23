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

async function openMenu() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /open menu/i }))
  return user
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

  it('renders a burger menu button', () => {
    renderNavbar()
    expect(
      screen.getByRole('button', { name: /open menu/i }),
    ).toBeInTheDocument()
  })

  it('does not render menu items until the menu is opened', () => {
    renderNavbar()
    expect(
      screen.queryByRole('button', { name: /toggle theme/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /about/i }),
    ).not.toBeInTheDocument()
  })

  it('renders theme toggle inside the menu when opened', async () => {
    renderNavbar()
    await openMenu()
    expect(
      screen.getByRole('menuitem', { name: /toggle theme/i }),
    ).toBeInTheDocument()
  })

  it('clicking theme toggle in the menu flips isDark in the store', async () => {
    renderNavbar()
    const user = await openMenu()

    expect(useThemeStore.getState().isDark).toBe(true)
    await user.click(screen.getByRole('menuitem', { name: /toggle theme/i }))
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
    const user = await openMenu()
    await user.click(screen.getByRole('menuitem', { name: /toggle theme/i }))
    expect(trackEvent).toHaveBeenCalledWith('theme_toggle', {
      new_theme: 'light',
    })
  })

  it('renders an About link inside the menu pointing to /about', async () => {
    renderNavbar()
    await openMenu()
    const link = screen.getByRole('menuitem', { name: /about/i })
    expect(link).toHaveAttribute('href', '/about')
  })

  it('fires about_nav_clicked when About menu item is clicked', async () => {
    renderNavbar()
    const user = await openMenu()
    await user.click(screen.getByRole('menuitem', { name: /about/i }))
    expect(trackEvent).toHaveBeenCalledWith('about_nav_clicked', undefined)
  })

  it('renders a Join Discord link in the navbar pointing to the Discord invite', () => {
    renderNavbar()
    const link = screen.getByRole('link', { name: /join discord/i })
    expect(link).toHaveAttribute('href', 'https://discord.gg/qfrXu8WQhu')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('fires navbar_discord_clicked when navbar Join Discord is clicked', async () => {
    renderNavbar()
    const user = userEvent.setup()
    await user.click(screen.getByRole('link', { name: /join discord/i }))
    expect(trackEvent).toHaveBeenCalledWith('navbar_discord_clicked', undefined)
  })

  it('renders a Join Discord entry at the top of the menu', async () => {
    renderNavbar()
    await openMenu()
    const menuDiscord = screen.getByRole('menuitem', { name: /join discord/i })
    expect(menuDiscord).toHaveAttribute('href', 'https://discord.gg/qfrXu8WQhu')
  })

  it('fires navbar_menu_discord_clicked when the menu Join Discord is clicked', async () => {
    renderNavbar()
    const user = await openMenu()
    await user.click(screen.getByRole('menuitem', { name: /join discord/i }))
    expect(trackEvent).toHaveBeenCalledWith(
      'navbar_menu_discord_clicked',
      undefined,
    )
  })
})
