import { trackEvent, trackPageView } from '../analytics'

describe('analytics', () => {
  const originalGtag = window.gtag

  afterEach(() => {
    window.gtag = originalGtag
  })

  describe('trackEvent', () => {
    it('calls window.gtag with event command and params', () => {
      window.gtag = vi.fn()
      trackEvent('player_search', { username: 'hikaru' })
      expect(window.gtag).toHaveBeenCalledWith('event', 'player_search', {
        username: 'hikaru',
      })
    })

    it('does not throw when window.gtag is undefined', () => {
      window.gtag = undefined as unknown as typeof window.gtag
      expect(() =>
        trackEvent('player_search', { username: 'hikaru' }),
      ).not.toThrow()
    })
  })

  describe('trackPageView', () => {
    it('calls window.gtag with page_view event', () => {
      window.gtag = vi.fn()
      trackPageView('/player/hikaru')
      expect(window.gtag).toHaveBeenCalledWith('event', 'page_view', {
        page_path: '/player/hikaru',
      })
    })

    it('does not throw when window.gtag is undefined', () => {
      window.gtag = undefined as unknown as typeof window.gtag
      expect(() => trackPageView('/player/hikaru')).not.toThrow()
    })
  })
})
