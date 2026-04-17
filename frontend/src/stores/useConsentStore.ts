import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ConsentStatus = 'pending' | 'granted' | 'denied'

interface ConsentState {
  consent: ConsentStatus
  accept: () => void
  decline: () => void
  initConsent: () => void
}

export const useConsentStore = create<ConsentState>()(
  persist(
    (set, get) => ({
      consent: 'pending',

      accept: () => {
        set({ consent: 'granted' })
        if (typeof window.gtag === 'function') {
          window.gtag('consent', 'update', { analytics_storage: 'granted' })
        }
      },

      decline: () => {
        set({ consent: 'denied' })
      },

      initConsent: () => {
        if (get().consent === 'granted' && typeof window.gtag === 'function') {
          window.gtag('consent', 'update', { analytics_storage: 'granted' })
        }
      },
    }),
    { name: 'cookie-consent' },
  ),
)
