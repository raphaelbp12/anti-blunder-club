// SPDX-License-Identifier: GPL-3.0-or-later
// Adapted from WintrChess (https://github.com/WintrCat/wintrchess), GPL-3.0.
// Removed runtime zod schema; kept the structural type and helpers.
// Server-only (de)serialization helpers were dropped.

import { Chess } from 'chess.js'
import { round, uniqueId } from 'lodash-es'

import type { BoardState } from './BoardState'
import PieceColour from '../constants/PieceColour'

export interface StateTreeNode {
  id: string
  mainline: boolean
  state: BoardState
  children: StateTreeNode[]
  parent?: StateTreeNode
}

/**
 * @description Search recursively for a node that passes a given
 * predicate, starting from and including a root node. Returns the
 * first passing node or undefined if one cannot be found
 */
export function findNodeRecursively(
  rootNode: StateTreeNode,
  predicate: (node: StateTreeNode) => boolean,
  backwards = false,
) {
  const frontier: StateTreeNode[] = [rootNode]

  while (frontier.length > 0) {
    const node = frontier.pop()
    if (!node) break

    if (predicate(node)) {
      return node
    }

    if (backwards) {
      if (node.parent) frontier.push(node.parent)
      continue
    }

    frontier.push(...node.children)
  }
}

/**
 * @description Returns a list of the given node and its entire line
 * of priority children, or all children unordered if `expand` is true.
 */
export function getNodeChain(rootNode: StateTreeNode, expand?: boolean) {
  const chain: StateTreeNode[] = []

  const frontier: StateTreeNode[] = [rootNode]

  while (frontier.length > 0) {
    const current = frontier.pop()
    if (!current) break

    chain.push(current)

    for (const child of current.children) {
      frontier.push(child)

      if (!expand) break
    }
  }

  return chain
}

/**
 * @description Returns a list of the given node plus all a chain
 * of its parents until the root node (inclusive)
 */
export function getNodeParentChain(node: StateTreeNode) {
  const chain: StateTreeNode[] = []

  let current: StateTreeNode | undefined = node

  while (current) {
    chain.push(current)
    current = current.parent
  }

  return chain
}

/**
 * @description Returns the move number of the given node. Can be decimal
 * for black moves, as these end in 0.5
 */
export function getNodeMoveNumber(
  node: StateTreeNode,
  initialPosition?: string,
) {
  let initialMoveNumber = 1

  if (initialPosition) {
    const board = new Chess(initialPosition)

    initialMoveNumber = board.moveNumber() + (board.turn() == 'b' ? 0.5 : 0)
  }

  let current: StateTreeNode = node
  let depth = 0

  while (current?.parent) {
    current = current.parent
    depth++
  }

  // current = Root Node at this point
  const pairDepth = (depth - 1) / 2

  return round(pairDepth, 1) + initialMoveNumber
}

/**
 * @description Returns a list of the given node's siblings.
 */
export function getNodeSiblings(node: StateTreeNode) {
  return node.parent?.children.filter((child) => child != node) || []
}

/**
 * @description Adds a child to the node based on the SAN move given;
 * returns the added node.
 */
export function addChildMove(node: StateTreeNode, san: string) {
  const existingNode = node.children.find(
    (child) => child.state.move?.san == san,
  )

  const childMove = new Chess(node.state.fen).move(san)

  const createdNode: StateTreeNode = {
    id: uniqueId(),
    mainline: node.mainline && !node.children.some((child) => child.mainline),
    parent: node,
    children: [],
    state: {
      fen: childMove.after,
      engineLines: [],
      move: {
        san: childMove.san,
        uci: childMove.lan,
      },
      moveColour:
        childMove.color == 'w' ? PieceColour.WHITE : PieceColour.BLACK,
    },
  }

  if (!existingNode) {
    node.children.push(createdNode)
  }

  return existingNode || createdNode
}
