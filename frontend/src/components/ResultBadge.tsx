import type { NormalizedResult } from '../utils/resultNormalization'

interface ResultBadgeProps {
  result: NormalizedResult
  /** Compact visual variant for tight rows. Defaults to `md`. */
  size?: 'sm' | 'md'
}

interface BadgeStyle {
  letter: string
  label: string
  /** Tailwind classes applied to the pill (border + text color). */
  classes: string
}

const STYLES: Record<NormalizedResult, BadgeStyle> = {
  win: {
    letter: 'W',
    label: 'Victory',
    classes: 'border-emerald-500 text-emerald-600 dark:text-emerald-400',
  },
  loss: {
    letter: 'L',
    label: 'Defeat',
    classes: 'border-rose-500 text-rose-600 dark:text-rose-400',
  },
  draw: {
    letter: 'D',
    label: 'Draw',
    classes: 'border-amber-500 text-amber-600 dark:text-amber-400',
  },
  unknown: {
    letter: '?',
    label: 'Unknown result',
    classes: 'border-gray-400 text-gray-500 dark:text-gray-400',
  },
}

/**
 * Outlined W/L/D badge. Transparent background, colored border + letter —
 * quietly informative without competing with the accuracy number.
 */
export function ResultBadge({ result, size = 'md' }: ResultBadgeProps) {
  const style = STYLES[result]
  const pillSize = size === 'sm' ? 'h-9 w-9 text-base' : 'h-10 w-10 text-lg'

  return (
    <span
      aria-label={style.label}
      className={`flex ${pillSize} shrink-0 items-center justify-center rounded-lg border-2 bg-transparent font-black ${style.classes}`}
    >
      {style.letter}
    </span>
  )
}
