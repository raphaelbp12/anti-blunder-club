import { describe, it, expect } from 'vitest'

import { getPlayerResult } from '../playerResult'
import type { ChessGame } from '../../services/chessComApi'

function makeGame(
  whiteName: string,
  whiteResult: string,
  blackName: string,
  blackResult: string,
): ChessGame {
  return {
    url: 'https://www.chess.com/game/live/1',
    white: { username: whiteName, rating: 1500, result: whiteResult },
    black: { username: blackName, rating: 1500, result: blackResult },
    timeClass: 'blitz',
    endTime: 0,
  }
}

describe('getPlayerResult', () => {
  it('returns "win" when the player played white and won', () => {
    const g = makeGame('alice', 'win', 'bob', 'checkmated')
    expect(getPlayerResult(g, 'alice')).toBe('win')
  })

  it('returns "win" when the player played black and won', () => {
    const g = makeGame('alice', 'timeout', 'bob', 'win')
    expect(getPlayerResult(g, 'bob')).toBe('win')
  })

  it('returns "loss" when the player lost (normalizes termination reasons)', () => {
    const g = makeGame('alice', 'resigned', 'bob', 'win')
    expect(getPlayerResult(g, 'alice')).toBe('loss')
  })

  it('returns "draw" when both sides drew', () => {
    const g = makeGame('alice', 'agreed', 'bob', 'agreed')
    expect(getPlayerResult(g, 'alice')).toBe('draw')
  })

  it('is case-insensitive on the username lookup', () => {
    const g = makeGame('Alice', 'win', 'bob', 'checkmated')
    expect(getPlayerResult(g, 'ALICE')).toBe('win')
  })

  it('returns "unknown" when the username is not one of the players', () => {
    const g = makeGame('alice', 'win', 'bob', 'checkmated')
    expect(getPlayerResult(g, 'charlie')).toBe('unknown')
  })
})
