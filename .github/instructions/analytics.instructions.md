---
applyTo: "frontend/src/**/*.{ts,tsx}"
description: "Analytics conventions: PostHog setup, tracked wrappers, custom events, measurability checklist"
---

# Analytics Instructions

## Setup

PostHog is the sole analytics provider. Runs on EU cloud in cookieless mode (`persistence: 'memory'`) — no cookies, no localStorage, no GDPR consent banner needed.

- Initialized in `src/main.tsx` with `PostHogProvider` and `PostHogErrorBoundary`.
- Config uses `defaults: '2026-01-30'` → auto-captures `$pageview` on every SPA navigation (History API), plus clicks, inputs, and unhandled React errors.

## How to Track Custom Events

Use the tracked wrapper components instead of bare HTML elements:

| Wrapper                | Wraps                   | Extra props                     |
| ---------------------- | ----------------------- | ------------------------------- |
| `TrackedButton`        | `<button>`              | `eventName`, `eventParams`      |
| `TrackedLink`          | react-router `<Link>`   | `eventName`, `eventParams`      |
| `TrackedExternalLink`  | `<a>`                   | `eventName`, `eventParams`      |

For programmatic flows (inside `navigate(...)` calls, `useEffect`, etc.), import `trackEvent()` from `utils/analytics.ts`.

All valid event names are typed in the `AnalyticsEvent` union in `utils/analytics.ts`. **Add new events to that union** — the type system enforces this.

## Current Custom Events

| Event                   | Trigger                                | Key params                              |
| ----------------------- | -------------------------------------- | --------------------------------------- |
| `player_search`         | User submits search form               | `username`                              |
| `player_search_result`  | Games load or error                    | `username`, `result`, `game_count`      |
| `player_card_click`     | Click recent player card               | `username`                              |
| `player_card_delete`    | Remove player from history             | `username`                              |
| `match_view`            | Navigate to match detail               | `username`, `game_id`                   |
| `external_link_click`   | Click "View on Chess.com"              | `url`                                   |
| `nav_click`             | Click navbar link                      | `link_name`, `destination`              |
| `theme_toggle`          | Toggle dark/light mode                 | `new_theme`                             |
| `analysis_viewed`       | View accuracy analysis                 | `username`, `games_analyzed`, `mean_accuracy` |

Dashboard: https://eu.posthog.com/project/161023/dashboard/627625

## Measurability Checklist

When implementing a new feature, always ask: **"How will we know if this feature is being used?"**

1. **Identify the key user action** that signals the feature works.
2. **Choose the right tracking method:**
   - Click on button/link/anchor → use the tracked wrapper.
   - Programmatic action → call `trackEvent()` directly.
   - Page view → PostHog handles automatically.
3. **Add the event name** to the `AnalyticsEvent` union.
4. **Include meaningful params** (username, counts, result status).
5. **Propose the event during plan mode** — list event name and params for approval.
