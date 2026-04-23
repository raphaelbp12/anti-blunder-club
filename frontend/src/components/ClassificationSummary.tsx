// SPDX-License-Identifier: GPL-3.0-or-later
//
// Presentational component rendering per-colour classification counts.
// Two variants:
//  - "row": compact horizontal row of mistake-only pills (Games tab card).
//    Renders `null` when all mistake counts are zero.
//  - "column": side-by-side White / Black columns listing every
//    classification with its count (Match page).

import type { Classification } from '../services/analysis/constants/Classification'
import type { ClassificationCounts } from '../services/analysis/summarizeClassifications'
import {
  classificationMeta,
  FULL_CLASSIFICATION_ORDER,
  MISTAKE_CLASSIFICATIONS,
} from '../utils/classificationMeta'

type RowProps = {
  variant: 'row'
  counts: ClassificationCounts
}

type ColumnProps = {
  variant: 'column'
  white: ClassificationCounts
  black: ClassificationCounts
}

export type ClassificationSummaryProps = RowProps | ColumnProps

export function ClassificationSummary(props: ClassificationSummaryProps) {
  if (props.variant === 'row') {
    return <RowVariant counts={props.counts} />
  }
  return <ColumnVariant white={props.white} black={props.black} />
}

function RowVariant({ counts }: { counts: ClassificationCounts }) {
  const entries = MISTAKE_CLASSIFICATIONS.filter((c) => counts[c] > 0)
  if (entries.length === 0) return null

  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      {entries.map((c) => (
        <li
          key={c}
          className="flex items-baseline gap-1"
          aria-label={`${counts[c]} ${classificationMeta[c].label}`}
        >
          <span className={`font-semibold ${classificationMeta[c].colorClass}`}>
            {counts[c]}
          </span>
          <span className="text-secondary">{classificationMeta[c].label}</span>
        </li>
      ))}
    </ul>
  )
}

function ColumnVariant({
  white,
  black,
}: {
  white: ClassificationCounts
  black: ClassificationCounts
}) {
  return (
    <div
      className="grid grid-cols-2 gap-4"
      aria-label="Move classification summary"
    >
      <Column heading="White" counts={white} colourKey="white" />
      <Column heading="Black" counts={black} colourKey="black" />
    </div>
  )
}

function Column({
  heading,
  counts,
  colourKey,
}: {
  heading: string
  counts: ClassificationCounts
  colourKey: 'white' | 'black'
}) {
  return (
    <section
      data-testid={`classification-column-${colourKey}`}
      className="flex flex-col gap-2 rounded-lg border border-border p-3"
    >
      <h3 className="text-sm font-semibold">{heading}</h3>
      <ul className="flex flex-col gap-1 text-sm">
        {(FULL_CLASSIFICATION_ORDER as readonly Classification[]).map((c) => {
          const meta = classificationMeta[c]
          return (
            <li key={c} className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`inline-block w-5 text-center font-semibold ${meta.colorClass}`}
                >
                  {meta.icon}
                </span>
                <span>{meta.label}</span>
              </span>
              <span className="font-semibold tabular-nums">{counts[c]}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
