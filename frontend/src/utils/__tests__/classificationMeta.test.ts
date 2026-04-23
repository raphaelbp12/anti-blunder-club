// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest'

import { Classification } from '../../services/analysis/constants/Classification'
import {
  classificationMeta,
  MISTAKE_CLASSIFICATIONS,
  FULL_CLASSIFICATION_ORDER,
  isMistake,
} from '../classificationMeta'

describe('classificationMeta', () => {
  it('has a label for every Classification', () => {
    for (const c of Object.values(Classification)) {
      expect(classificationMeta[c].label).toBeTruthy()
      expect(classificationMeta[c].shortLabel).toBeTruthy()
    }
  })

  it('exposes mistake classifications in worst-to-least-bad order', () => {
    expect(MISTAKE_CLASSIFICATIONS).toEqual([
      Classification.BLUNDER,
      Classification.MISTAKE,
      Classification.INACCURACY,
      Classification.RISKY,
    ])
  })

  it('isMistake is true for bad classifications and false for good ones', () => {
    expect(isMistake(Classification.BLUNDER)).toBe(true)
    expect(isMistake(Classification.MISTAKE)).toBe(true)
    expect(isMistake(Classification.INACCURACY)).toBe(true)
    expect(isMistake(Classification.RISKY)).toBe(true)

    expect(isMistake(Classification.BEST)).toBe(false)
    expect(isMistake(Classification.BRILLIANT)).toBe(false)
    expect(isMistake(Classification.EXCELLENT)).toBe(false)
    expect(isMistake(Classification.OKAY)).toBe(false)
    expect(isMistake(Classification.CRITICAL)).toBe(false)
    expect(isMistake(Classification.FORCED)).toBe(false)
    expect(isMistake(Classification.THEORY)).toBe(false)
  })

  it('full order lists every Classification exactly once', () => {
    const set = new Set(FULL_CLASSIFICATION_ORDER)
    expect(set.size).toBe(FULL_CLASSIFICATION_ORDER.length)
    expect(set.size).toBe(Object.values(Classification).length)
  })
})
