import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { HelmetProvider } from 'react-helmet-async'
import { MemoryRouter } from 'react-router-dom'
import { trackEvent } from '../../utils/analytics'
import { AboutPage } from '../AboutPage'

vi.mock('../../utils/analytics', async () => {
  const actual = await vi.importActual<typeof import('../../utils/analytics')>(
    '../../utils/analytics',
  )
  return { ...actual, trackEvent: vi.fn() }
})

const DISCORD_URL = 'https://discord.gg/qfrXu8WQhu'
const SOURCE_URL = 'https://github.com/raphaelbp12/anti-blunder-club'
const WINTRCHESS_URL = 'https://github.com/WintrCat/wintrchess'
const ISSUES_URL = 'https://github.com/raphaelbp12/anti-blunder-club/issues'

function renderAboutPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>
    </HelmetProvider>,
  )
}

describe('AboutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a top-level About heading', () => {
    renderAboutPage()
    expect(
      screen.getByRole('heading', { level: 1, name: /about/i }),
    ).toBeInTheDocument()
  })

  it('renders the Discord call-to-action before the app description', () => {
    renderAboutPage()
    const discordLink = screen.getByRole('link', {
      name: /join (our|the) discord/i,
    })
    const descriptionHeading = screen.getByRole('heading', {
      name: /what is anti-blunder club/i,
    })
    expect(discordLink).toBeInTheDocument()
    expect(descriptionHeading).toBeInTheDocument()
    expect(
      discordLink.compareDocumentPosition(descriptionHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('Discord link points to the invite URL and opens in a new tab', () => {
    renderAboutPage()
    const link = screen.getByRole('link', { name: /join (our|the) discord/i })
    expect(link).toHaveAttribute('href', DISCORD_URL)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('tracks about_discord_clicked when Discord CTA is clicked', async () => {
    renderAboutPage()
    const user = userEvent.setup()
    await user.click(
      screen.getByRole('link', { name: /join (our|the) discord/i }),
    )
    expect(trackEvent).toHaveBeenCalledWith('about_discord_clicked', undefined)
  })

  it('lists the key points about the app', () => {
    renderAboutPage()
    expect(screen.getByText(/client-side/i)).toBeInTheDocument()
    expect(screen.getByText(/does not store/i)).toBeInTheDocument()
    expect(screen.getByText(/free to use/i)).toBeInTheDocument()
    expect(screen.getByText(/learn chess/i)).toBeInTheDocument()
  })

  it('renders a feedback link to Discord and tracks the click', async () => {
    renderAboutPage()
    const user = userEvent.setup()
    const link = screen.getByRole('link', { name: /feedback on discord/i })
    expect(link).toHaveAttribute('href', DISCORD_URL)
    await user.click(link)
    expect(trackEvent).toHaveBeenCalledWith('about_feedback_link_clicked', {
      destination: 'discord',
    })
  })

  it('renders a feedback link to GitHub issues and tracks the click', async () => {
    renderAboutPage()
    const user = userEvent.setup()
    const link = screen.getByRole('link', { name: /open an issue/i })
    expect(link).toHaveAttribute('href', ISSUES_URL)
    await user.click(link)
    expect(trackEvent).toHaveBeenCalledWith('about_feedback_link_clicked', {
      destination: 'github_issues',
    })
  })

  it('renders the source code link and tracks the click', async () => {
    renderAboutPage()
    const user = userEvent.setup()
    const link = screen.getByRole('link', { name: /source code/i })
    expect(link).toHaveAttribute('href', SOURCE_URL)
    expect(link).toHaveAttribute('target', '_blank')
    await user.click(link)
    expect(trackEvent).toHaveBeenCalledWith('about_source_clicked', undefined)
  })

  it('renders the WintrChess credit link and tracks the click', async () => {
    renderAboutPage()
    const user = userEvent.setup()
    const link = screen.getByRole('link', { name: /wintrchess/i })
    expect(link).toHaveAttribute('href', WINTRCHESS_URL)
    expect(link).toHaveAttribute('target', '_blank')
    await user.click(link)
    expect(trackEvent).toHaveBeenCalledWith(
      'about_wintrchess_clicked',
      undefined,
    )
  })

  it('mentions the GPL license', () => {
    renderAboutPage()
    expect(screen.getAllByText(/GPL/i).length).toBeGreaterThan(0)
  })
})
