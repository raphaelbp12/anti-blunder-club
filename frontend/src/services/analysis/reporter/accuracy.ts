// SPDX-License-Identifier: GPL-3.0-or-later
// Adapted from WintrChess (https://github.com/WintrCat/wintrchess), GPL-3.0.

import { meanBy } from 'lodash-es'

import { getNodeChain } from '../types/StateTreeNode'
import type { StateTreeNode } from '../types/StateTreeNode'
import type { Evaluation } from '../types/Evaluation'
import PieceColour from '../constants/PieceColour'
import { getExpectedPoints, getExpectedPointsLoss } from './expectedPoints'
import { DEFAULT_ACCURACY_PARAMS, type AccuracyParams } from './AccuracyParams'

const MIN_ACCURACY_FOR_HARMONIC = 1

function clampAccuracy(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.min(100, Math.max(0, value))
}

function arithmeticMean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((acc, v) => acc + v, 0) / values.length
}

function harmonicMean(values: number[]): number {
  if (values.length === 0) return 0
  const safe = values.map((v) => Math.max(v, MIN_ACCURACY_FOR_HARMONIC))
  const recip = safe.reduce((acc, v) => acc + 1 / v, 0)
  return safe.length / recip
}

/**
 * Windowed harmonic mean: average over sliding windows of `windowSize`
 * plies gives the harmonic mean extra weight in rough stretches — this is
 * the shape Chess.com's CAPS 2 uses. Adapted as a mean of window-harmonic
 * means so a single blunder in a long game still drags the total down.
 */
function windowedHarmonicMean(values: number[], windowSize: number): number {
  if (values.length === 0) return 0
  const size = Math.max(1, windowSize)
  if (values.length <= size) return harmonicMean(values)

  const windowMeans: number[] = []
  for (let i = 0; i <= values.length - size; i++) {
    windowMeans.push(harmonicMean(values.slice(i, i + size)))
  }
  return arithmeticMean(windowMeans)
}

/**
 * Volatility-weighted harmonic mean: each ply's contribution is weighted by
 * a proxy for position volatility. We approximate volatility from the local
 * std-dev of accuracies (higher variance ⇒ trickier position ⇒ more weight).
 */
function volatilityWeightedHarmonic(
  values: number[],
  exponent: number,
): number {
  if (values.length === 0) return 0
  if (values.length === 1) return values[0]

  const mean = arithmeticMean(values)
  const weights = values.map((v) => Math.pow(Math.abs(v - mean) + 1, exponent))
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1

  // Volatility-weighted mean, then pull toward harmonic mean for sensitivity
  // to the worst moves.
  const weighted = values.reduce(
    (acc, v, i) => acc + (v * weights[i]) / totalWeight,
    0,
  )
  const harmonic = harmonicMean(values)
  return (weighted + harmonic) / 2
}

export function aggregateAccuracies(
  accuracies: number[],
  params: AccuracyParams,
): number {
  if (accuracies.length === 0) return 0
  const clamped = accuracies.map(clampAccuracy)

  switch (params.aggregator) {
    case 'mean':
      return arithmeticMean(clamped)
    case 'windowed-harmonic':
      return windowedHarmonicMean(clamped, params.windowSize)
    case 'weighted-harmonic':
      return volatilityWeightedHarmonic(
        clamped,
        params.volatilityWeightExponent,
      )
    default:
      return arithmeticMean(clamped)
  }
}

export function getGameAccuracy(
  rootNode: StateTreeNode,
  params: AccuracyParams = DEFAULT_ACCURACY_PARAMS,
) {
  const accuracyHolders = getNodeChain(rootNode).filter(
    (node) => node.state.accuracy != undefined,
  )

  const whiteValues = accuracyHolders
    .filter((n) => n.state.moveColour == PieceColour.WHITE)
    .map((n) => n.state.accuracy!)

  const blackValues = accuracyHolders
    .filter((n) => n.state.moveColour == PieceColour.BLACK)
    .map((n) => n.state.accuracy!)

  // Keep the unweighted `meanBy` branch for strict parity with the legacy
  // implementation so existing tests and snapshots don't shift.
  if (params.aggregator === 'mean') {
    return {
      white: meanBy(
        accuracyHolders.filter((n) => n.state.moveColour == PieceColour.WHITE),
        (n) => n.state.accuracy!,
      ),
      black: meanBy(
        accuracyHolders.filter((n) => n.state.moveColour == PieceColour.BLACK),
        (n) => n.state.accuracy!,
      ),
    }
  }

  return {
    white: aggregateAccuracies(whiteValues, params),
    black: aggregateAccuracies(blackValues, params),
  }
}

export function getMoveAccuracy(
  previousEvaluation: Evaluation,
  currentEvaluation: Evaluation,
  moveColour: PieceColour,
  params: AccuracyParams = DEFAULT_ACCURACY_PARAMS,
) {
  const pointLoss = getExpectedPointsLoss(
    previousEvaluation,
    currentEvaluation,
    moveColour,
    params,
  )

  return (
    params.moveCoefA * Math.exp(-params.moveCoefK * pointLoss) -
    params.moveCoefC
  )
}

// Re-export so consumers don't have to reach into expectedPoints.
export { getExpectedPoints }
