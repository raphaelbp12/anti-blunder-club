import posthog from 'posthog-js'
import { trackEvent } from '../analytics'

vi.mock('posthog-js', () => ({
  default: { capture: vi.fn() },
}))

describe('analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('trackEvent', () => {
    it('calls posthog.capture with event name and params', () => {
      trackEvent('player_search', { username: 'hikaru' })
      expect(posthog.capture).toHaveBeenCalledWith('player_search', {
        username: 'hikaru',
      })
    })

    it('calls posthog.capture without params when none provided', () => {
      trackEvent('theme_toggle')
      expect(posthog.capture).toHaveBeenCalledWith('theme_toggle', undefined)
    })
  })
})
