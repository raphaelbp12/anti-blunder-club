import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useConsentStore } from '../../stores/useConsentStore'
import { CookieConsentBanner } from '../CookieConsentBanner'

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    useConsentStore.setState({ consent: 'pending' })
  })

  it("renders when consent is 'pending'", () => {
    render(<CookieConsentBanner />)
    expect(
      screen.getByRole('region', { name: /cookie consent/i }),
    ).toBeInTheDocument()
  })

  it("does not render when consent is 'granted'", () => {
    useConsentStore.setState({ consent: 'granted' })
    render(<CookieConsentBanner />)
    expect(
      screen.queryByRole('region', { name: /cookie consent/i }),
    ).not.toBeInTheDocument()
  })

  it("does not render when consent is 'denied'", () => {
    useConsentStore.setState({ consent: 'denied' })
    render(<CookieConsentBanner />)
    expect(
      screen.queryByRole('region', { name: /cookie consent/i }),
    ).not.toBeInTheDocument()
  })

  it('renders Allow analytics and No analytics buttons', () => {
    render(<CookieConsentBanner />)
    expect(
      screen.getByRole('button', { name: /allow analytics/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /no analytics/i }),
    ).toBeInTheDocument()
  })

  it("clicking Allow analytics sets consent to 'granted'", async () => {
    const user = userEvent.setup()
    render(<CookieConsentBanner />)
    await user.click(screen.getByRole('button', { name: /allow analytics/i }))
    expect(useConsentStore.getState().consent).toBe('granted')
  })

  it("clicking No analytics sets consent to 'denied'", async () => {
    const user = userEvent.setup()
    render(<CookieConsentBanner />)
    await user.click(screen.getByRole('button', { name: /no analytics/i }))
    expect(useConsentStore.getState().consent).toBe('denied')
  })

  it('banner disappears after clicking Allow analytics', async () => {
    const user = userEvent.setup()
    render(<CookieConsentBanner />)
    await user.click(screen.getByRole('button', { name: /allow analytics/i }))
    expect(
      screen.queryByRole('region', { name: /cookie consent/i }),
    ).not.toBeInTheDocument()
  })
})
