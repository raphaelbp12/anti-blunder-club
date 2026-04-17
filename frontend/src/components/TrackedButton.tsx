import { forwardRef, type ComponentPropsWithRef, type MouseEvent } from 'react'
import {
  trackEvent,
  type AnalyticsEvent,
  type EventParams,
} from '../utils/analytics'

interface TrackedButtonProps extends ComponentPropsWithRef<'button'> {
  eventName: AnalyticsEvent
  eventParams?: EventParams
}

export const TrackedButton = forwardRef<HTMLButtonElement, TrackedButtonProps>(
  function TrackedButton({ eventName, eventParams, onClick, ...rest }, ref) {
    function handleClick(e: MouseEvent<HTMLButtonElement>) {
      trackEvent(eventName, eventParams)
      onClick?.(e)
    }

    return <button ref={ref} onClick={handleClick} {...rest} />
  },
)
