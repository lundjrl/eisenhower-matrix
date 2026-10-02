import {clamp} from '~/lib/clamp'
import {MAX_OFFSET} from '~/lib/cascade-position'

export const COLUMN_COUNT = 3
const STEP_X = 0.26
const BASE_X = 0.1
const BASE_Y = 0.15

export interface Position {
  x: number
  y: number
}

/**
 * Places an imported task in a neat left-to-right, top-to-bottom grid
 * within its quadrant. Unlike cascadePosition (a diagonal stagger used for
 * one-at-a-time manual adds), this is meant for placing many tasks at once
 * without them overlapping each other.
 *
 * `index` should be offset past the quadrant's existing task count, so
 * imported tasks land after whatever is already on the board. `rowCount`
 * is the total number of grid rows the quadrant will end up with (existing
 * plus imported, divided across COLUMN_COUNT columns) -- the row step is
 * scaled to that count so rows never clamp to the same y, however many
 * items land in one quadrant (up to the 200-item import cap).
 */
export const gridPosition = (index: number, rowCount: number): Position => {
  const column = index % COLUMN_COUNT
  const row = Math.floor(index / COLUMN_COUNT)
  const stepY = rowCount > 1 ? (MAX_OFFSET - BASE_Y) / (rowCount - 1) : 0

  return {
    x: clamp(BASE_X + column * STEP_X, 0, MAX_OFFSET),
    y: clamp(BASE_Y + row * stepY, 0, MAX_OFFSET),
  }
}
