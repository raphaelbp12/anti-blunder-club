// SPDX-License-Identifier: GPL-3.0-or-later
//
// Cross-validation for the grid-sweep winner.
//
// Two checks:
//   1. Random 70/30 split (deterministic hash on gameId). Rank all
//      trials by MAE on the 70%, pick top-50, re-rank on the 30%, and
//      report the Spearman rank correlation between the two rankings.
//   2. Leave-one-user-out. For each user with ≥ 2 games, train on the
//      other users and report the top-3 MAE params plus where the
//      overall winner lands on that user's games.
//
// Run: `npm run calibrate:holdout`

import { execSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { DEFAULT_ACCURACY_PARAMS } from '../../src/services/analysis/reporter/AccuracyParams'
import type { AccuracyParams } from '../../src/services/analysis/reporter/AccuracyParams'

import {
  enumerateGrid,
  evaluateTrial,
  formatParams,
  loadGames,
  type GameData,
  type TrialResult,
} from './sweep'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPORTS_DIR = resolve(__dirname, 'reports')

// The winner from the full-corpus grid sweep (2026-04-19 d=18 run).
const GRID_WINNER: AccuracyParams = {
  ...DEFAULT_ACCURACY_PARAMS,
  centipawnGradient: 0.003,
  moveCoefA: 100,
  moveCoefK: 6.5,
  moveCoefC: 1.5,
  aggregator: 'windowed-harmonic',
  windowSize: 6,
}

function paramsKey(p: AccuracyParams): string {
  return JSON.stringify([
    p.centipawnGradient,
    p.moveCoefA,
    p.moveCoefK,
    p.moveCoefC,
    p.aggregator,
    p.windowSize,
    p.volatilityWeightExponent,
  ])
}

// Deterministic 32-bit hash (djb2-ish) on gameId so the split is stable.
function hash32(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i)
  }
  return h >>> 0
}

function split70_30(games: GameData[]): { train: GameData[]; test: GameData[] } {
  const train: GameData[] = []
  const test: GameData[] = []
  for (const g of games) {
    // Use modulo 10 on hash: 7 buckets go to train, 3 to test.
    const bucket = hash32(g.gameId) % 10
    if (bucket < 7) train.push(g)
    else test.push(g)
  }
  return { train, test }
}

function rankByMae(
  games: GameData[],
  paramsList: AccuracyParams[],
): Array<TrialResult & { rank: number }> {
  const trials = paramsList.map((p) => evaluateTrial(games, p))
  trials.sort((a, b) => a.mae - b.mae)
  return trials.map((t, i) => ({ ...t, rank: i + 1 }))
}

function spearman(ranksA: number[], ranksB: number[]): number {
  // Pearson on ranks.
  const n = ranksA.length
  if (n < 2) return 0
  const mx = ranksA.reduce((a, b) => a + b, 0) / n
  const my = ranksB.reduce((a, b) => a + b, 0) / n
  let num = 0,
    dx2 = 0,
    dy2 = 0
  for (let i = 0; i < n; i++) {
    const dx = ranksA[i] - mx
    const dy = ranksB[i] - my
    num += dx * dy
    dx2 += dx * dx
    dy2 += dy * dy
  }
  const denom = Math.sqrt(dx2 * dy2)
  return denom === 0 ? 0 : num / denom
}

function gitSha(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

// Gather the set of usernames for which this game counts as "theirs".
function usersOf(g: GameData): string[] {
  return [g.whiteUsername.toLowerCase(), g.blackUsername.toLowerCase()]
}

function main() {
  mkdirSync(REPORTS_DIR, { recursive: true })
  const games = loadGames(null)
  if (games.length === 0) {
    console.error('No games found.')
    process.exit(1)
  }
  console.log(`Loaded ${games.length} games`)

  // Precompute all candidate params once; reused across every split.
  const allParams = [...enumerateGrid()]
  console.log(`Grid size: ${allParams.length} presets`)

  const winnerKey = paramsKey(GRID_WINNER)
  const winnerIdx = allParams.findIndex((p) => paramsKey(p) === winnerKey)
  if (winnerIdx < 0) {
    console.error('Grid winner not found in enumerated grid!')
    process.exit(1)
  }

  // --- Phase 1a: Random 70/30 ---
  console.log('\n--- Random 70/30 split ---')
  const { train, test } = split70_30(games)
  console.log(`  train=${train.length}  test=${test.length}`)

  const trainRanked = rankByMae(train, allParams)
  const top50Keys = new Set(trainRanked.slice(0, 50).map((t) => paramsKey(t.params)))
  const top50Params = allParams.filter((p) => top50Keys.has(paramsKey(p)))

  const testRanked = rankByMae(test, top50Params)

  // Rank-correlation: for each of the top-50, compare train-rank vs test-rank.
  const byKeyTrain = new Map<string, number>()
  trainRanked.slice(0, 50).forEach((t, i) => byKeyTrain.set(paramsKey(t.params), i + 1))
  const pairs: { key: string; trainRank: number; testRank: number }[] = []
  testRanked.forEach((t, i) => {
    const k = paramsKey(t.params)
    pairs.push({ key: k, trainRank: byKeyTrain.get(k)!, testRank: i + 1 })
  })
  const rho = spearman(
    pairs.map((p) => p.trainRank),
    pairs.map((p) => p.testRank),
  )

  const winnerTrainRank = trainRanked.findIndex(
    (t) => paramsKey(t.params) === winnerKey,
  ) + 1
  const winnerTestEntry = testRanked.find(
    (t) => paramsKey(t.params) === winnerKey,
  )
  const winnerTestRank = testRanked.findIndex(
    (t) => paramsKey(t.params) === winnerKey,
  ) + 1

  console.log(
    `  winner rank: train=${winnerTrainRank}/${allParams.length}  test=${winnerTestRank}/50`,
  )
  console.log(`  winner test MAE: ${winnerTestEntry?.mae.toFixed(2)}`)
  console.log(`  Spearman rho on top-50: ${rho.toFixed(3)}`)

  // --- Phase 1b: Leave-one-user-out ---
  console.log('\n--- Leave-one-user-out ---')
  const userSet = new Set<string>()
  for (const g of games) usersOf(g).forEach((u) => userSet.add(u))
  const users = [...userSet].sort()

  interface FoldResult {
    user: string
    nTest: number
    top3: TrialResult[]
    winnerRank: number | null // rank among all trials on the fold's test set
    winnerMae: number | null
    foldBestMae: number | null // per-fold best MAE across all 3402 presets
  }
  const folds: FoldResult[] = []

  for (const user of users) {
    const heldOut = games.filter((g) =>
      usersOf(g).includes(user),
    )
    if (heldOut.length < 2) continue // require ≥2 games for a meaningful MAE.

    const trained = games.filter((g) => !usersOf(g).includes(user))
    const trainedRanked = rankByMae(trained, allParams)
    // Top-3 on the training fold, evaluated on the held-out user's games.
    const top3Params = trainedRanked.slice(0, 3).map((t) => t.params)
    const heldOutTop3 = top3Params.map((p) => evaluateTrial(heldOut, p))
    const winnerFoldRanked = rankByMae(heldOut, allParams)
    const winnerRank =
      winnerFoldRanked.findIndex((t) => paramsKey(t.params) === winnerKey) + 1
    const winnerMae = winnerFoldRanked.find(
      (t) => paramsKey(t.params) === winnerKey,
    )?.mae
    folds.push({
      user,
      nTest: heldOut.length,
      top3: heldOutTop3,
      winnerRank: winnerRank || null,
      winnerMae: winnerMae ?? null,
      foldBestMae: winnerFoldRanked[0]?.mae ?? null,
    })
    console.log(
      `  ${user.padEnd(16)} n=${heldOut.length}  winnerRank=${winnerRank}/${allParams.length}  winnerMAE=${winnerMae?.toFixed(2)}`,
    )
  }

  const top10FoldCount = folds.filter(
    (f) => f.winnerRank !== null && f.winnerRank <= 10,
  ).length

  // A more meaningful metric for small-n folds: "how close is the winner's
  // MAE to the per-fold best?" (the per-fold best is the best ACROSS ALL
  // 3402 presets evaluated on the held-out user's games — not the
  // train-set top-1.)
  const gapToBest = folds.map((f) => {
    const best = f.foldBestMae ?? Number.POSITIVE_INFINITY
    const winner = f.winnerMae ?? Number.POSITIVE_INFINITY
    return winner - best
  })
  const meanGap = gapToBest.reduce((a, b) => a + b, 0) / (gapToBest.length || 1)
  const worstGap = Math.max(...gapToBest)
  const withinOneFolds = gapToBest.filter((g) => g <= 1).length

  // --- Full-corpus sanity baseline ---
  const fullWinner = evaluateTrial(games, GRID_WINNER)

  // --- Report ---
  const now = new Date()
  const stamp = now.toISOString().replace(/[:.]/g, '-').replace(/Z$/, 'Z')
  const md: string[] = []
  md.push(`# Holdout Validation Report`)
  md.push('')
  md.push(`- Generated: \`${now.toISOString()}\``)
  md.push(`- Git SHA: \`${gitSha()}\``)
  md.push(`- Games: ${games.length}`)
  md.push(`- Grid size: ${allParams.length}`)
  md.push(`- Winner: \`${formatParams(GRID_WINNER)}\``)
  md.push('')
  md.push(`## Full corpus`)
  md.push('')
  md.push(`| MAE | bias | r |`)
  md.push(`|---:|---:|---:|`)
  md.push(
    `| ${fullWinner.mae.toFixed(2)} | ${fullWinner.bias.toFixed(2)} | ${fullWinner.pearson.toFixed(3)} |`,
  )
  md.push('')

  md.push(`## Random 70/30 split`)
  md.push('')
  md.push(`- Train: ${train.length} games | Test: ${test.length} games`)
  md.push(`- Winner train rank: **${winnerTrainRank}** / ${allParams.length}`)
  md.push(`- Winner test rank: **${winnerTestRank}** / 50`)
  md.push(`- Winner test MAE: **${winnerTestEntry?.mae.toFixed(2)}** (bias=${winnerTestEntry?.bias.toFixed(2)}, r=${winnerTestEntry?.pearson.toFixed(3)})`)
  md.push(`- Spearman ρ on top-50 (train vs test ranks): **${rho.toFixed(3)}**`)
  md.push('')
  md.push(`### Top-10 on train vs. their test rank`)
  md.push('')
  md.push(`| train rank | test rank | MAE (test) | bias (test) | params |`)
  md.push(`|---:|---:|---:|---:|---|`)
  for (let i = 0; i < 10; i++) {
    const t = trainRanked[i]
    const k = paramsKey(t.params)
    const tr = testRanked.findIndex((x) => paramsKey(x.params) === k) + 1
    const testE = testRanked.find((x) => paramsKey(x.params) === k)
    md.push(
      `| ${i + 1} | ${tr || '—'} | ${testE?.mae.toFixed(2) ?? '—'} | ${testE?.bias.toFixed(2) ?? '—'} | ${formatParams(t.params)} |`,
    )
  }
  md.push('')

  md.push(`## Leave-one-user-out`)
  md.push('')
  md.push(`- Users with ≥ 2 games: ${folds.length}`)
  md.push(
    `- Grid winner lands in top-10 of fold: **${top10FoldCount} / ${folds.length}** folds`,
  )
  md.push(
    `- Winner MAE gap to per-fold best: mean=**${meanGap.toFixed(2)}**, worst=**${worstGap.toFixed(2)}**`,
  )
  md.push(
    `- Folds where winner is within 1.0 MAE of per-fold best: **${withinOneFolds}/${folds.length}**`,
  )
  md.push('')
  md.push(`| user | n | winner rank | winner MAE | per-fold best MAE | gap |`)
  md.push(`|---|---:|---:|---:|---:|---:|`)
  for (const f of folds) {
    const gap =
      f.winnerMae !== null && f.foldBestMae !== null
        ? f.winnerMae - f.foldBestMae
        : null
    md.push(
      `| ${f.user} | ${f.nTest} | ${f.winnerRank ?? '—'} | ${f.winnerMae?.toFixed(2) ?? '—'} | ${f.foldBestMae?.toFixed(2) ?? '—'} | ${gap?.toFixed(2) ?? '—'} |`,
    )
  }
  md.push('')

  md.push(`## Verdict`)
  md.push('')
  const verdicts: string[] = []
  if (winnerTestRank > 0 && winnerTestRank <= 10) {
    verdicts.push(`✅ Winner ranks #${winnerTestRank} / 50 on the random hold-out (≤10 required).`)
  } else {
    verdicts.push(`❌ Winner ranks #${winnerTestRank} / 50 on the random hold-out (>10).`)
  }
  if (rho >= 0.5) {
    verdicts.push(`✅ Spearman ρ = ${rho.toFixed(3)} (≥ 0.5 shows top-50 ordering is stable).`)
  } else {
    verdicts.push(`⚠️ Spearman ρ = ${rho.toFixed(3)} (< 0.5: top-50 ordering is noisy).`)
  }
  if (top10FoldCount >= folds.length - 2) {
    verdicts.push(`✅ Winner in top-10 of ${top10FoldCount}/${folds.length} user folds (≥ n-2 required).`)
  } else {
    verdicts.push(`❌ Winner in top-10 of only ${top10FoldCount}/${folds.length} user folds.`)
  }
  if (withinOneFolds >= folds.length - 2) {
    verdicts.push(
      `✅ Winner within 1.0 MAE of per-fold best in ${withinOneFolds}/${folds.length} folds (mean gap ${meanGap.toFixed(2)}).`,
    )
  } else {
    verdicts.push(
      `⚠️ Winner within 1.0 MAE of per-fold best in only ${withinOneFolds}/${folds.length} folds (mean gap ${meanGap.toFixed(2)}).`,
    )
  }
  md.push(verdicts.map((v) => `- ${v}`).join('\n'))
  md.push('')

  const mdPath = resolve(REPORTS_DIR, `holdout-${stamp}.md`)
  const jsonPath = resolve(REPORTS_DIR, `holdout-${stamp}.json`)
  writeFileSync(mdPath, md.join('\n'))
  writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        generatedAt: now.toISOString(),
        gitSha: gitSha(),
        winner: GRID_WINNER,
        fullCorpus: fullWinner,
        random7030: {
          train: train.length,
          test: test.length,
          winnerTrainRank,
          winnerTestRank,
          winnerTest: winnerTestEntry,
          spearmanRho: rho,
        },
        leaveOneUserOut: folds,
        leaveOneUserOutSummary: {
          meanGap,
          worstGap,
          withinOneFolds,
          top10FoldCount,
        },
      },
      null,
      2,
    ),
  )

  console.log('\nReport written:')
  console.log(`  ${mdPath}`)
  console.log(`  ${jsonPath}`)
  console.log('\nVerdict:')
  for (const v of verdicts) console.log(`  ${v}`)
}

main()
