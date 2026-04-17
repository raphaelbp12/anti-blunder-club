import { normalizeResult, type NormalizedResult } from '../resultNormalization'

describe('normalizeResult', () => {
  it('normalizes "win" to "win"', () => {
    expect(normalizeResult('win')).toBe<NormalizedResult>('win')
  })

  describe('loss results', () => {
    it.each(['checkmated', 'timeout', 'resigned', 'lose', 'abandoned'])(
      'normalizes "%s" to "loss"',
      (result) => {
        expect(normalizeResult(result)).toBe<NormalizedResult>('loss')
      },
    )
  })

  describe('draw results', () => {
    it.each([
      'agreed',
      'stalemate',
      'repetition',
      'insufficient',
      '50move',
      'timevsinsufficient',
    ])('normalizes "%s" to "draw"', (result) => {
      expect(normalizeResult(result)).toBe<NormalizedResult>('draw')
    })
  })

  it('returns "unknown" for unrecognized result strings', () => {
    expect(normalizeResult('some_new_result')).toBe<NormalizedResult>('unknown')
  })
})
