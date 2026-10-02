import {describe, expect, it} from 'vitest'

import {COLUMN_COUNT, gridPosition} from '~/lib/grid-position'

const rowCountFor = (total: number): number => Math.ceil(total / COLUMN_COUNT)

describe('gridPosition', () => {
  it('starts near the top-left of the quadrant for the first task', () => {
    expect(gridPosition(0, rowCountFor(1))).toEqual({x: 0.1, y: 0.15})
  })

  it('steps across columns left to right before wrapping to a new row', () => {
    const rowCount = rowCountFor(4)
    const first = gridPosition(0, rowCount)
    const second = gridPosition(1, rowCount)
    const third = gridPosition(2, rowCount)
    const fourth = gridPosition(3, rowCount)

    expect(second.x).toBeGreaterThan(first.x)
    expect(second.y).toBe(first.y)

    expect(third.x).toBeGreaterThan(second.x)
    expect(third.y).toBe(first.y)

    expect(fourth.x).toBe(first.x)
    expect(fourth.y).toBeGreaterThan(first.y)
  })

  it('keeps every position within the quadrant bounds, even for a large import', () => {
    const total = 200
    const rowCount = rowCountFor(total)

    for (let i = 0; i < total; i++) {
      const {x, y} = gridPosition(i, rowCount)

      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(0.85)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(0.85)
    }
  })

  it('never places two items in a single import at the same position, even at 200 items in one quadrant', () => {
    const total = 200
    const rowCount = rowCountFor(total)
    const seen = new Set<string>()

    for (let i = 0; i < total; i++) {
      const {x, y} = gridPosition(i, rowCount)
      const key = `${x.toFixed(6)},${y.toFixed(6)}`

      expect(seen.has(key)).toBe(false)
      seen.add(key)
    }
  })

  it('spaces rows across the full height for a large single-quadrant import instead of clamping them all to the same y', () => {
    const total = 36
    const rowCount = rowCountFor(total)

    const row0 = gridPosition(0, rowCount)
    const lastRow = gridPosition(total - 1, rowCount)

    expect(row0.y).toBe(0.15)
    expect(lastRow.y).toBeCloseTo(0.85)
    expect(lastRow.y).not.toBe(row0.y)
  })
})
