// SPDX-License-Identifier: GPL-3.0-or-later
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Classification } from '../../services/analysis/constants/Classification'
import {
  emptyClassificationCounts,
  type ClassificationCounts,
} from '../../services/analysis/summarizeClassifications'
import { ClassificationSummary } from '../ClassificationSummary'

function counts(partial: Partial<ClassificationCounts>): ClassificationCounts {
  return { ...emptyClassificationCounts(), ...partial }
}

describe('<ClassificationSummary>', () => {
  describe('row variant (Games tab card)', () => {
    it('renders a pill for each non-zero mistake classification', () => {
      render(
        <ClassificationSummary
          variant="row"
          counts={counts({
            [Classification.BLUNDER]: 2,
            [Classification.MISTAKE]: 1,
            [Classification.INACCURACY]: 3,
          })}
        />,
      )
      expect(screen.getByLabelText('2 Blunder')).toBeInTheDocument()
      expect(screen.getByLabelText('1 Mistake')).toBeInTheDocument()
      expect(screen.getByLabelText('3 Inaccuracy')).toBeInTheDocument()
    })

    it('omits zero-count mistake classifications', () => {
      render(
        <ClassificationSummary
          variant="row"
          counts={counts({ [Classification.BLUNDER]: 1 })}
        />,
      )
      expect(screen.queryByText(/Mistake/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Inaccuracy/)).not.toBeInTheDocument()
    })

    it('renders nothing when there are no mistakes', () => {
      const { container } = render(
        <ClassificationSummary
          variant="row"
          counts={counts({ [Classification.BEST]: 10 })}
        />,
      )
      expect(container.firstChild).toBeNull()
    })

    it('does not display good classifications like Best in the row variant', () => {
      render(
        <ClassificationSummary
          variant="row"
          counts={counts({
            [Classification.BLUNDER]: 1,
            [Classification.BEST]: 5,
          })}
        />,
      )
      expect(screen.queryByText(/Best/)).not.toBeInTheDocument()
    })
  })

  describe('column variant (Match page)', () => {
    it('renders side-by-side White and Black columns with all classifications', () => {
      render(
        <ClassificationSummary
          variant="column"
          white={counts({
            [Classification.BLUNDER]: 2,
            [Classification.BEST]: 4,
          })}
          black={counts({
            [Classification.MISTAKE]: 1,
            [Classification.EXCELLENT]: 3,
          })}
        />,
      )
      const whiteCol = screen.getByTestId('classification-column-white')
      const blackCol = screen.getByTestId('classification-column-black')
      expect(within(whiteCol).getByText(/^2$/)).toBeInTheDocument() // blunder
      expect(within(whiteCol).getByText(/^4$/)).toBeInTheDocument() // best
      expect(within(blackCol).getByText(/^1$/)).toBeInTheDocument() // mistake
      expect(within(blackCol).getByText(/^3$/)).toBeInTheDocument() // excellent
      // Column headers
      expect(
        screen.getByRole('heading', { name: /white/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { name: /black/i }),
      ).toBeInTheDocument()
    })

    it('still renders rows with a 0 count in the column variant', () => {
      render(
        <ClassificationSummary
          variant="column"
          white={emptyClassificationCounts()}
          black={emptyClassificationCounts()}
        />,
      )
      // Every label shows, even with 0 counts.
      expect(screen.getAllByText('Blunder').length).toBe(2)
      expect(screen.getAllByText('Best').length).toBe(2)
    })
  })
})
