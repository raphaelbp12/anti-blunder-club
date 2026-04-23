// SPDX-License-Identifier: GPL-3.0-or-later
//
// Presentational metadata for each move `Classification`. Pure data —
// no React, no Tailwind class strings, so both web and future exports
// (report generation, etc.) can reuse it.

import { Classification } from '../services/analysis/constants/Classification'

export interface ClassificationMeta {
  /** Full human label, e.g. "Blunder". */
  label: string
  /** Short label suitable for compact pills, e.g. "Blunder" → "Blunders" plural is caller's concern. */
  shortLabel: string
  /** Unicode glyph (emoji) used as a visual marker. */
  icon: string
  /** Tailwind text colour class for the glyph / count. */
  colorClass: string
}

export const classificationMeta: Record<Classification, ClassificationMeta> = {
  [Classification.BRILLIANT]: {
    label: 'Brilliant',
    shortLabel: 'Brilliant',
    icon: '!!',
    colorClass: 'text-cyan-500',
  },
  [Classification.CRITICAL]: {
    label: 'Critical',
    shortLabel: 'Critical',
    icon: '!',
    colorClass: 'text-emerald-500',
  },
  [Classification.BEST]: {
    label: 'Best',
    shortLabel: 'Best',
    icon: '★',
    colorClass: 'text-green-500',
  },
  [Classification.EXCELLENT]: {
    label: 'Excellent',
    shortLabel: 'Excellent',
    icon: '✓',
    colorClass: 'text-lime-500',
  },
  [Classification.OKAY]: {
    label: 'Okay',
    shortLabel: 'Okay',
    icon: '·',
    colorClass: 'text-slate-400',
  },
  [Classification.INACCURACY]: {
    label: 'Inaccuracy',
    shortLabel: 'Inaccuracy',
    icon: '?!',
    colorClass: 'text-yellow-500',
  },
  [Classification.RISKY]: {
    label: 'Risky',
    shortLabel: 'Risky',
    icon: '⚠',
    colorClass: 'text-amber-500',
  },
  [Classification.MISTAKE]: {
    label: 'Mistake',
    shortLabel: 'Mistake',
    icon: '?',
    colorClass: 'text-orange-500',
  },
  [Classification.BLUNDER]: {
    label: 'Blunder',
    shortLabel: 'Blunder',
    icon: '??',
    colorClass: 'text-red-500',
  },
  [Classification.THEORY]: {
    label: 'Theory',
    shortLabel: 'Theory',
    icon: '📖',
    colorClass: 'text-violet-400',
  },
  [Classification.FORCED]: {
    label: 'Forced',
    shortLabel: 'Forced',
    icon: '→',
    colorClass: 'text-slate-400',
  },
}

/**
 * Classifications that count as mistakes on the Games-tab summary row,
 * ordered worst → least bad. Intentionally excludes `OKAY` (not a
 * mistake) and `THEORY`/`FORCED` (neutral).
 */
export const MISTAKE_CLASSIFICATIONS = [
  Classification.BLUNDER,
  Classification.MISTAKE,
  Classification.INACCURACY,
  Classification.RISKY,
] as const

/**
 * Full classification ladder in the order we show in the Match-page
 * side-by-side column (best-first → worst-last, with neutrals last).
 */
export const FULL_CLASSIFICATION_ORDER = [
  Classification.BRILLIANT,
  Classification.CRITICAL,
  Classification.BEST,
  Classification.EXCELLENT,
  Classification.OKAY,
  Classification.INACCURACY,
  Classification.RISKY,
  Classification.MISTAKE,
  Classification.BLUNDER,
  Classification.THEORY,
  Classification.FORCED,
] as const

export function isMistake(c: Classification): boolean {
  return (MISTAKE_CLASSIFICATIONS as readonly Classification[]).includes(c)
}
