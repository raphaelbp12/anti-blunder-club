import type { NormalizedResult } from '../utils/resultNormalization'

interface ResultBadgeProps {
  result: NormalizedResult
  /** Compact visual variant for tight rows. Defaults to `md`. */
  size?: 'sm' | 'md'
}

interface BadgeStyle {
  letter: string
  label: string
  tagline: string
  /** Tailwind classes applied to the pill. */
  classes: string
}

const STYLES: Record<NormalizedResult, BadgeStyle> = {
  win: {
    letter: 'W',
    label: 'Victory',
    tagline: 'GG!',
    classes:
      'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white ' +
      'shadow-emerald-500/30 ring-emerald-400/60',
  },
  loss: {
    letter: 'L',
    label: 'Defeat',
    tagline: 'Rough one',
    classes:
      'bg-gradient-to-br from-rose-400 to-rose-600 text-white ' +
      'shadow-rose-500/30 ring-rose-400/60',
  },
  draw: {
    letter: 'D',
    label: 'Draw',
    tagline: 'Stalemate',
    classes:
      'bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 ' +
      'shadow-amber-500/30 ring-amber-400/60',
  },
  unknown: {
    letter: '?',
    label: 'Unknown result',
    tagline: '—',
    classes:
      'bg-gradient-to-br from-gray-300 to-gray-500 text-white ' +
      'shadow-gray-500/20 ring-gray-400/40',
  },
}

/**
 * Bold, color-coded W/L/D pill with a playful tagline. Built to stand out on
 * the accuracy card without competing with the accuracy number for attention.
 */
export function ResultBadge({ result, size = 'md' }: ResultBadgeProps) {
  const style = STYLES[result]
  const pillSize = size === 'sm' ? 'h-9 w-9 text-base' : 'h-12 w-12 text-xl'

  return (
    <div className="flex flex-col items-center gap-1" aria-label={style.label}>
      <span
        className={`flex ${pillSize} items-center justify-center rounded-xl font-black ring-2 ring-inset shadow-md transition-transform hover:-rotate-3 hover:scale-105 ${style.classes}`}
      >
        {style.letter}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-secondary">
        {style.tagline}
      </span>
    </div>
  )
}
