export type NormalizedResult = 'win' | 'loss' | 'draw' | 'unknown'

const WIN_RESULTS = new Set(['win'])

const LOSS_RESULTS = new Set([
  'checkmated',
  'timeout',
  'resigned',
  'lose',
  'abandoned',
])

const DRAW_RESULTS = new Set([
  'agreed',
  'stalemate',
  'repetition',
  'insufficient',
  '50move',
  'timevsinsufficient',
])

export function normalizeResult(result: string): NormalizedResult {
  if (WIN_RESULTS.has(result)) return 'win'
  if (LOSS_RESULTS.has(result)) return 'loss'
  if (DRAW_RESULTS.has(result)) return 'draw'
  return 'unknown'
}
