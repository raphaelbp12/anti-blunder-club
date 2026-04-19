// SPDX-License-Identifier: GPL-3.0-or-later
// Adapted from WintrChess (https://github.com/WintrCat/wintrchess), GPL-3.0.
// Removed runtime zod schema; kept the structural type and helpers.

import { Chess } from 'chess.js'
import { uniq, maxBy } from 'lodash-es'

import EngineVersion from '../constants/EngineVersion'
import type { Evaluation } from './Evaluation'
import type { Move } from './Move'

export interface EngineLine {
  evaluation: Evaluation
  source: EngineVersion
  depth: number
  index: number
  moves: Move[]
}

export function isEngineLineEqual(line: EngineLine, other: EngineLine) {
  return (
    line.depth == other.depth &&
    line.index == other.index &&
    line.source == other.source
  )
}

export function getLineGroupSibling(
  lines: EngineLine[],
  referenceLine: EngineLine,
  index: number,
) {
  return lines.find(
    (line) =>
      line.depth == referenceLine.depth &&
      line.source == referenceLine.source &&
      line.index == index,
  )
}

export function getTopEngineLine(lines: EngineLine[]) {
  return maxBy(lines, (line) => line.depth - line.index)
}

export function pickEngineLines(
  fen: string,
  lines: EngineLine[],
  targets?: {
    count?: number
    depth?: number
    source?: EngineVersion
  },
) {
  let targetCount = targets?.count
  const targetDepth = targets?.depth ?? 0
  const targetSource = targets?.source

  if (targetCount) {
    targetCount = Math.min(
      Math.max(new Chess(fen).moves().length, 1),
      targetCount,
    )
  }

  const depths = uniq(
    lines
      .filter((line) => line.depth >= targetDepth || line.depth == 0)
      .map((line) => line.depth)
      .sort((a, b) => b - a),
  )

  function findLineSet(depth: number, source: EngineVersion) {
    const lineSet: EngineLine[] = []

    while (!targetCount || lineSet.length < targetCount) {
      const nextLine = lines.find(
        (line) =>
          line.depth == depth &&
          line.source == source &&
          line.index == lineSet.length + 1,
      )
      if (!nextLine) break

      lineSet.push(nextLine)
    }

    return lineSet
  }

  for (const depth of depths) {
    const lineSets = Object.values(EngineVersion)
      .filter(
        (source) =>
          source == EngineVersion.LICHESS_CLOUD ||
          !targetSource ||
          source == targetSource,
      )
      .map((source) => findLineSet(depth, source))

    const qualifyingLineSet = maxBy(lineSets, (lineSet) => lineSet.length)

    if (
      qualifyingLineSet &&
      (!targetCount || qualifyingLineSet.length >= targetCount)
    )
      return qualifyingLineSet.sort((a, b) => a.index - b.index)
  }

  return null
}
