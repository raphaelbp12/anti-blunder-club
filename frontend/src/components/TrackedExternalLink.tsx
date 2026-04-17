import { forwardRef, type ComponentPropsWithRef, type MouseEvent } from 'react'
import { trackEvent, type AnalyticsEvent } from '../utils/analytics'

interface TrackedExternalLinkProps extends ComponentPropsWithRef<'a'> {
  eventName: AnalyticsEvent
  eventParams?: GtagEventParams
}

export const TrackedExternalLink = forwardRef<
  HTMLAnchorElement,
  TrackedExternalLinkProps
>(function TrackedExternalLink(
  { eventName, eventParams, onClick, ...rest },
  ref,
) {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    trackEvent(eventName, eventParams)
    onClick?.(e)
  }

  return <a ref={ref} onClick={handleClick} {...rest} />
})
