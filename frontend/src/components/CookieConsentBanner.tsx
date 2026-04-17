import { useConsentStore } from '../stores/useConsentStore'

export function CookieConsentBanner() {
  const consent = useConsentStore((s) => s.consent)
  const accept = useConsentStore((s) => s.accept)
  const decline = useConsentStore((s) => s.decline)

  if (consent !== 'pending') return null

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface-alt px-6 py-4 shadow-lg"
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-sm text-secondary">
          We only collect anonymous usage statistics to improve the site — no
          personal data is stored.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={decline}
            className="rounded-lg border border-border px-4 py-2 text-sm text-secondary hover:text-primary"
          >
            No analytics
          </button>
          <button
            onClick={accept}
            className="rounded-lg bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover"
          >
            Allow analytics
          </button>
        </div>
      </div>
    </div>
  )
}
