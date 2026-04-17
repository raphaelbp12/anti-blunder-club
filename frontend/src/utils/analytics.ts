import posthog from 'posthog-js'

export interface EventParams {
  [key: string]: string | number | boolean | undefined
}

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
  | 'analysis_viewed'
  | 'tab_switched'
  | 'game_filter_applied'

export function trackEvent(
  eventName: AnalyticsEvent,
  params?: EventParams,
): void {
  if (import.meta.env.DEV) {
    console.log('[Analytics]', eventName, params)
  }
  posthog.capture(eventName, params)
}
