import { useConsentStore } from '../useConsentStore'

describe('useConsentStore', () => {
  const originalGtag = window.gtag

  beforeEach(() => {
    useConsentStore.setState({ consent: 'pending' })
    localStorage.clear()
    window.gtag = originalGtag
  })

  afterEach(() => {
    window.gtag = originalGtag
  })

  it("defaults to 'pending' consent", () => {
    expect(useConsentStore.getState().consent).toBe('pending')
  })

  describe('accept()', () => {
    it("sets consent to 'granted'", () => {
      useConsentStore.getState().accept()
      expect(useConsentStore.getState().consent).toBe('granted')
    })

    it('calls gtag consent update with analytics_storage granted', () => {
      window.gtag = vi.fn()
      useConsentStore.getState().accept()
      expect(window.gtag).toHaveBeenCalledWith('consent', 'update', {
        analytics_storage: 'granted',
      })
    })

    it('does not throw when window.gtag is undefined', () => {
      window.gtag = undefined as unknown as typeof window.gtag
      expect(() => useConsentStore.getState().accept()).not.toThrow()
    })
  })

  describe('decline()', () => {
    it("sets consent to 'denied'", () => {
      useConsentStore.getState().decline()
      expect(useConsentStore.getState().consent).toBe('denied')
    })

    it('does not call gtag', () => {
      window.gtag = vi.fn()
      useConsentStore.getState().decline()
      expect(window.gtag).not.toHaveBeenCalled()
    })
  })

  describe('initConsent()', () => {
    it("calls gtag consent update when persisted state is 'granted'", () => {
      useConsentStore.setState({ consent: 'granted' })
      window.gtag = vi.fn()
      useConsentStore.getState().initConsent()
      expect(window.gtag).toHaveBeenCalledWith('consent', 'update', {
        analytics_storage: 'granted',
      })
    })

    it("does not call gtag when persisted state is 'pending'", () => {
      useConsentStore.setState({ consent: 'pending' })
      window.gtag = vi.fn()
      useConsentStore.getState().initConsent()
      expect(window.gtag).not.toHaveBeenCalled()
    })

    it("does not call gtag when persisted state is 'denied'", () => {
      useConsentStore.setState({ consent: 'denied' })
      window.gtag = vi.fn()
      useConsentStore.getState().initConsent()
      expect(window.gtag).not.toHaveBeenCalled()
    })
  })
})
