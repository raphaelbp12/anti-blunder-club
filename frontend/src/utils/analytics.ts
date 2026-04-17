export type AnalyticsEvent =
  | 'page_view'
  | 'nav_click'
  | 'player_search'
  | 'player_search_result'
  | 'player_card_click'
  | 'player_card_delete'
  | 'match_view'
  | 'external_link_click'
  | 'theme_toggle'

export function trackEvent(
  eventName: AnalyticsEvent,
  params?: GtagEventParams,
): void {
  if (import.meta.env.DEV) {
    console.log('[GA]', eventName, params)
  }
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params)
  }
}

export function trackPageView(path: string): void {
  trackEvent('page_view', { page_path: path })
}
