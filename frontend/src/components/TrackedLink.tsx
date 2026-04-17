import { type MouseEvent } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { trackEvent, type AnalyticsEvent } from '../utils/analytics'

interface TrackedLinkProps extends LinkProps {
  eventName: AnalyticsEvent
  eventParams?: GtagEventParams
}

export function TrackedLink({
  eventName,
  eventParams,
  onClick,
  ...rest
}: TrackedLinkProps) {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    trackEvent(eventName, eventParams)
    onClick?.(e)
  }

  return <Link onClick={handleClick} {...rest} />
}
