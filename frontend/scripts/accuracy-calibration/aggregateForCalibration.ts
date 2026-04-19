// SPDX-License-Identifier: GPL-3.0-or-later
//
// Re-exports `aggregateAccuracies` from the production accuracy module so
// calibration scripts can aggregate raw accuracy arrays without building a
// synthetic StateTreeNode chain.

import type { AccuracyParams } from '../../src/services/analysis/reporter/AccuracyParams'
import { aggregateAccuracies } from '../../src/services/analysis/reporter/accuracy'

export function aggregateAccuraciesForCalibration(
  values: number[],
  params: AccuracyParams,
): number {
  return aggregateAccuracies(values, params)
}
